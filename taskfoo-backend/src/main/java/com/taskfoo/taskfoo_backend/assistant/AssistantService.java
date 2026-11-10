package com.taskfoo.taskfoo_backend.assistant;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskfoo.taskfoo_backend.model.*;
import com.taskfoo.taskfoo_backend.repository.*;
import com.taskfoo.taskfoo_backend.service.TaskService;
import com.taskfoo.taskfoo_backend.support.RequestContext;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import static com.taskfoo.taskfoo_backend.assistant.AssistantModel.*;

@Service
class AssistantService {
    private final AssistantModel model;
    private final ObjectMapper json;
    private final TaskRepository tasks;
    private final TaskService taskService;
    private final ProjectRepository projects;
    private final EpicRepository epics;
    private final StatusRepository statuses;
    private final PriorityRepository priorities;
    private final UserRepository users;
    private final ProposalRepository proposals;

    AssistantService(AssistantModel model, ObjectMapper json, TaskRepository tasks, TaskService taskService,
                     ProjectRepository projects, EpicRepository epics, StatusRepository statuses,
                     PriorityRepository priorities, UserRepository users, ProposalRepository proposals) {
        this.model = model;
        this.json = json;
        this.tasks = tasks;
        this.taskService = taskService;
        this.projects = projects;
        this.epics = epics;
        this.statuses = statuses;
        this.priorities = priorities;
        this.users = users;
        this.proposals = proposals;
    }

    record Command(String tool, Long taskId, Integer version, String title, String description,
                   LocalDate startDate, LocalDate dueDate, Long epicId, Long statusId, Long priorityId) {}
    record Match(long id, String title) {}
    record Preview(UUID id, Command command, String before, String after, Instant expiresAt) {}
    record Chat(String kind, List<Match> tasks, Preview preview, String message) {}
    record Receipt(UUID proposalId, long taskId) {}

    Chat chat(long actorId, long projectId, String message) {
        if (!projects.existsById(projectId)) throw error(HttpStatus.NOT_FOUND, "Project not found");
        if (projects.findAll().stream().anyMatch(project ->
                project.getId() != projectId && mentionsProject(message, project.getName()))) {
            return clarify("Select that project before requesting a task action.");
        }
        boolean write = canWrite(actorId);
        JsonNode calls;
        try {
            calls = model.toolCalls(message, write);
        } catch (RestClientException e) {
            throw error(HttpStatus.SERVICE_UNAVAILABLE, "Local model is unavailable");
        }
        if (calls == null || !calls.isArray() || calls.size() != 1) {
            return clarify("Specify one task action, its title and the required fields.");
        }
        JsonNode function = calls.get(0).path("function");
        String tool = function.path("name").asText();
        JsonNode args = function.path("arguments");
        try {
            if (!args.isObject()) throw new IllegalArgumentException("Invalid tool arguments.");
            String title = field(args, "title", 160);
            if (title == null) return clarify("Enter the task title.");
            if (SEARCH.equals(tool)) {
                only(args, "title");
                var matches = tasks.findTop10ByEpic_Project_IdAndTitleContainingIgnoreCaseOrderById(projectId, title)
                    .stream().map(task -> new Match(task.getId(), task.getTitle())).toList();
                return new Chat("matches", matches, null, matches.isEmpty() ? "No matching tasks." : null);
            }
            if (!write) return clarify("Only administrators and project managers can propose changes.");
            if (CREATE.equals(tool)) {
                only(args, "title", "description", "epic", "status", "priority", "startDate", "dueDate");
                var epic = named(epics.findByProject_Id(projectId), Epic::getName, field(args, "epic", 160));
                var status = named(statuses.findAll(), Status::getName, field(args, "status", 160));
                var priority = named(priorities.findAll(), Priority::getName, field(args, "priority", 160));
                LocalDate start = date(args, "startDate");
                LocalDate due = date(args, "dueDate");
                if (start.isAfter(due)) return clarify("Due date must be on or after the start date.");
                String description = field(args, "description", 1000);
                explicit(message, title, description, epic.getName(), status.getName(), priority.getName(),
                         start.toString(), due.toString());
                return preview(actorId, projectId,
                    new Command(tool, null, null, title, description, start, due, epic.getId(), status.getId(), priority.getId()),
                    "No task", title + " · " + epic.getName() + " · " + status.getName() + " · " + priority.getName()
                        + " · " + start + " to " + due + (description == null ? "" : "\n" + description));
            }
            if (!UPDATE.equals(tool) && !STATUS.equals(tool)) return clarify("Unsupported action.");
            var task = unique(tasks.findTop2ByEpic_Project_IdAndTitleIgnoreCaseOrderById(projectId, title));
            if (STATUS.equals(tool)) {
                only(args, "title", "status");
                var status = named(statuses.findAll(), Status::getName, field(args, "status", 160));
                explicit(message, title, status.getName());
                String previous = task.getStatus() == null ? "No status" : task.getStatus().getName();
                if (task.getStatus() != null && Objects.equals(task.getStatus().getId(), status.getId())) {
                    return clarify("The task already has that status.");
                }
                return preview(actorId, projectId, new Command(tool, task.getId(), task.getVersion(),
                    null, null, null, null, null, status.getId(), null), previous, status.getName());
            }
            only(args, "title", "newTitle", "description");
            String newTitle = field(args, "newTitle", 160);
            String description = field(args, "description", 1000);
            explicit(message, title, newTitle, description);
            if ((newTitle == null || newTitle.equals(task.getTitle()))
                    && (description == null || description.equals(task.getDescription()))) {
                return clarify("Enter a changed title or description.");
            }
            return preview(actorId, projectId, new Command(tool, task.getId(), task.getVersion(),
                newTitle, description, null, null, null, null, null),
                details(task.getTitle(), task.getDescription()),
                details(newTitle == null ? task.getTitle() : newTitle,
                        description == null ? task.getDescription() : description));
        } catch (IllegalArgumentException ex) {
            return clarify(ex.getMessage());
        }
    }

    @Transactional
    public Receipt confirm(long actorId, UUID id) {
        Proposal proposal = proposals.lock(id).filter(value -> value.actorId == actorId)
            .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Proposal not found"));
        if (!canWrite(actorId)) throw error(HttpStatus.FORBIDDEN, "Write access required");
        if (proposal.resultTaskId != null) return new Receipt(id, proposal.resultTaskId);
        if (!Instant.now().isBefore(proposal.expiresAt)) throw error(HttpStatus.GONE, "Proposal expired");
        if (!projects.existsById(proposal.projectId)) throw conflict("Project no longer exists");
        var auditContext = RequestContext.get();
        if (auditContext != null) {
            auditContext.actorId = actorId;
            auditContext.pageContext = "ASSISTANT";
            auditContext.clientChangeId = id.toString();
        }
        Command cmd = decode(proposal.command);
        Task saved;
        if (CREATE.equals(cmd.tool())) {
            Epic epic = epics.findById(cmd.epicId())
                .filter(value -> value.getProject() != null && Objects.equals(value.getProject().getId(), proposal.projectId))
                .orElseThrow(() -> conflict("Epic is no longer in this project"));
            Task task = new Task();
            task.setEpic(epic);
            task.setTitle(cmd.title());
            task.setDescription(cmd.description());
            task.setStartDate(cmd.startDate());
            task.setDueDate(cmd.dueDate());
            task.setStatus(statuses.findById(cmd.statusId()).orElseThrow(() -> conflict("Status no longer exists")));
            task.setPriority(priorities.findById(cmd.priorityId()).orElseThrow(() -> conflict("Priority no longer exists")));
            saved = taskService.createTask(task);
        } else {
            Task task = tasks.findByIdAndEpic_Project_Id(cmd.taskId(), proposal.projectId)
                .orElseThrow(() -> conflict("Task is no longer in this project"));
            if (!Objects.equals(task.getVersion(), cmd.version())) throw conflict("Task changed since preview");
            if (STATUS.equals(cmd.tool())) {
                statuses.findById(cmd.statusId()).orElseThrow(() -> conflict("Status no longer exists"));
                saved = taskService.changeStatus(task.getId(), cmd.statusId(), cmd.version());
            } else {
                if (cmd.title() != null) task.setTitle(cmd.title());
                if (cmd.description() != null) task.setDescription(cmd.description());
                saved = taskService.save(task);
            }
        }
        proposal.resultTaskId = saved.getId();
        return new Receipt(id, saved.getId());
    }

    private boolean canWrite(long actorId) {
        return users.findById(actorId).map(User::getRoles)
            .map(roles -> roles.contains(Role.ADMIN) || roles.contains(Role.PM)).orElse(false);
    }

    private Chat preview(long actorId, long projectId, Command command, String before, String after) {
        try {
            Proposal proposal = proposals.save(new Proposal(actorId, projectId, json.writeValueAsString(command)));
            return new Chat("preview", null, new Preview(proposal.id, command, before, after, proposal.expiresAt), null);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Unable to save proposal", ex);
        }
    }

    private Command decode(String value) {
        try {
            return json.readValue(value, Command.class);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Invalid stored proposal", ex);
        }
    }

    private static boolean mentionsProject(String message, String name) {
        if (name == null || name.isBlank()) return false;
        String quoted = Pattern.quote(name);
        return Pattern.compile("(?iu)(?:\\bin\\s+" + quoted + "(?![\\p{L}\\p{N}])|"
            + "(?<![\\p{L}\\p{N}])" + quoted + "\\s+içindeki\\b)").matcher(message).find();
    }

    private static void explicit(String message, String... values) {
        String input = message.toLowerCase(Locale.ROOT);
        for (String value : values) {
            if (value != null && !input.contains(value.toLowerCase(Locale.ROOT))) {
                throw new IllegalArgumentException("Provide the exact values to change in your request.");
            }
        }
    }

    private static String details(String title, String description) {
        return title + (description == null || description.isBlank() ? "" : "\n" + description);
    }

    private static String field(JsonNode args, String name, int limit) {
        JsonNode value = args.get(name);
        if (value == null) return null;
        if (!value.isTextual() || value.textValue().length() > limit) {
            throw new IllegalArgumentException("Invalid " + name + ".");
        }
        return value.textValue().isBlank() ? null : value.textValue().strip();
    }

    private static void only(JsonNode args, String... allowed) {
        args.fieldNames().forEachRemaining(name -> {
            if (!Arrays.asList(allowed).contains(name)) throw new IllegalArgumentException("Unexpected field " + name);
        });
    }

    private static LocalDate date(JsonNode args, String name) {
        String value = field(args, name, 10);
        try {
            if (value != null) return LocalDate.parse(value);
        } catch (DateTimeParseException ignored) {
            // The caller gets a consistent clarification for invalid or missing dates.
        }
        throw new IllegalArgumentException("Specify " + name + " in YYYY-MM-DD format.");
    }

    private static <T> T named(List<T> values, Function<T, String> name, String target) {
        if (target == null) throw new IllegalArgumentException("Specify the epic, status and priority by name.");
        return unique(values.stream().filter(value -> Objects.equals(
            name.apply(value).toLowerCase(Locale.ROOT), target.toLowerCase(Locale.ROOT))).toList());
    }

    private static <T> T unique(List<T> matches) {
        if (matches.size() != 1) throw new IllegalArgumentException("Use an exact name with one match in the selected project.");
        return matches.getFirst();
    }

    private static Chat clarify(String message) {
        return new Chat("clarify", null, null, message);
    }

    private static ResponseStatusException conflict(String message) {
        return error(HttpStatus.CONFLICT, message);
    }

    private static ResponseStatusException error(HttpStatus status, String message) {
        return new ResponseStatusException(status, message);
    }
}
