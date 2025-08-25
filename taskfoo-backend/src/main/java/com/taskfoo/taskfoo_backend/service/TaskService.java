package com.taskfoo.taskfoo_backend.service;

import com.taskfoo.taskfoo_backend.model.*;
import com.taskfoo.taskfoo_backend.repository.AuditEventRepository;
import com.taskfoo.taskfoo_backend.repository.TaskRepository;
import com.taskfoo.taskfoo_backend.support.RequestContext;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import static com.taskfoo.taskfoo_backend.model.AuditEvent.AuditAction;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final AuditEventRepository auditRepository;
    private final SimpMessagingTemplate broker;

    public TaskService(TaskRepository taskRepository,
                       AuditEventRepository auditRepository,
                       SimpMessagingTemplate broker) {
        this.taskRepository = taskRepository;
        this.auditRepository = auditRepository;
        this.broker = broker;
    }

    /* ---------------- Queries ---------------- */

    public List<Task> searchTasks(String keyword) {
        return taskRepository.findByTitleContainingIgnoreCase(keyword);
    }

    public List<Task> getAllTasks() {
        return taskRepository.findAll();
    }

    public Task getTaskById(Long id) {
        return taskRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Task not found"));
    }

    /* ---------------- Commands ---------------- */

    /** CREATE */
    @Transactional
    public Task createTask(Task task) {
        Task saved = taskRepository.save(task);

        // Audit
        writeAudit(saved.getId(), AuditAction.CREATE,
                List.of(new AuditEvent.ChangedField("statusId", null, saved.getStatus() != null ? saved.getStatus().getId() : null)),
                Map.of());

        // WS
        publish("TASK_CREATED", saved, extractProjectId(saved));
        return saved;
    }

    /** Genel amaçlı update (PUT) */
    @Transactional
    public Task save(Task task) {
        Task before = taskRepository.findById(task.getId())
                .orElseThrow(() -> new EntityNotFoundException("Task not found"));

        Task saved = taskRepository.saveAndFlush(task);

        // Basit diff örneği (istersen genişlet)
        Long beforeStatus = before.getStatus() != null ? before.getStatus().getId() : null;
        Long afterStatus  = saved.getStatus()  != null ? saved.getStatus().getId()  : null;

        if (!Objects.equals(beforeStatus, afterStatus)) {
            writeAudit(saved.getId(), AuditAction.UPDATE,
                    List.of(new AuditEvent.ChangedField("statusId", beforeStatus, afterStatus)),
                    Map.of());
        } else {
            writeAudit(saved.getId(), AuditAction.UPDATE, null, Map.of());
        }

        publish("TASK_UPDATED", saved, extractProjectId(saved));
        return saved;
    }

    /** DELETE */
    @Transactional
    public void deleteTask(Long id) {
        Task existingTask = getTaskById(id);

        writeAudit(existingTask.getId(), AuditAction.DELETE, null, Map.of(
                "fromStatusId", existingTask.getStatus() != null ? existingTask.getStatus().getId() : null
        ));

        taskRepository.delete(existingTask);

        publish("TASK_DELETED", new TaskDeletedPayload(existingTask.getId(), nowIso()), extractProjectId(existingTask));
    }

    /** STATUS CHANGE (drag&drop) */
    @Transactional
    public Task changeStatus(Long taskId, Long statusId, Integer version) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));

        // Optimistic locking
        if (!Objects.equals(task.getVersion(), version)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Task was updated by another user");
        }

        Long fromStatusId = task.getStatus() != null ? task.getStatus().getId() : null;
        Long toStatusId   = statusId;

        if (Objects.equals(fromStatusId, toStatusId)) {
            return task; // no-op
        }

        // sadece ID set’leyerek hafif status set
        Status newStatus = new Status();
        newStatus.setId(toStatusId);
        task.setStatus(newStatus);

        Task saved = taskRepository.saveAndFlush(task);

        // Audit (MOVE + field diff)
        writeAudit(saved.getId(), AuditAction.MOVE,
                List.of(new AuditEvent.ChangedField("statusId", fromStatusId, toStatusId)),
                Map.of("fromStatusId", fromStatusId, "toStatusId", toStatusId));

        // WS: standart payload
        TaskStatusChangedPayload payload = new TaskStatusChangedPayload(
                saved.getId(),
                fromStatusId,
                toStatusId,
                nowIso(),
                saved // snapshot
        );
        publish("TASK_STATUS_CHANGED", payload, extractProjectId(saved));

        return saved;
    }

    /** ASSIGNEES REPLACE */
    @Transactional
    public Task replaceAssignees(Task task, List<User> users, Integer version) {
        if (!Objects.equals(task.getVersion(), version)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Task was updated by another user");
        }
        task.setAssignedUsers(users);
        Task saved = taskRepository.saveAndFlush(task);

        writeAudit(saved.getId(), AuditAction.ASSIGN, null, Map.of("assigneeCount", users.size()));

        publish("TASK_ASSIGNEES_UPDATED", new TaskAssigneesUpdatedPayload(saved.getId(), nowIso(), saved), extractProjectId(saved));
        return saved;
    }

    /** DATES UPDATE (start/due) */
    @Transactional
    public Task updateTaskDates(Long id, LocalDate startDate, LocalDate dueDate) {
        Task t = taskRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Task not found: " + id));

        LocalDate beforeStart = t.getStartDate();
        LocalDate beforeDue   = t.getDueDate();

        t.setStartDate(startDate);
        t.setDueDate(dueDate);

        Task saved = taskRepository.saveAndFlush(t);

        writeAudit(saved.getId(), AuditAction.UPDATE,
                List.of(
                        new AuditEvent.ChangedField("startDate", beforeStart, startDate),
                        new AuditEvent.ChangedField("dueDate",   beforeDue,   dueDate)
                ),
                Map.of());

        publish("TASK_DATES_UPDATED", new TaskDatesUpdatedPayload(saved.getId(), nowIso(), saved), extractProjectId(saved));
        return saved;
    }

    /* ---------------- Internals ---------------- */
    private void writeAudit(Long taskId,
                            AuditAction action,
                            List<AuditEvent.ChangedField> changed,
                            Map<String, Object> metadata) {
        var rc = RequestContext.get();

        AuditEvent ev = AuditEvent.builder()
                .entityType("TASK")
                .entityId(taskId)
                .action(action)
                .changedFields(changed)
                .metadata(metadata == null || metadata.isEmpty() ? null : metadata)
                .actorId(rc.actorId)
                .actorName(rc.actorName)
                .pageContext(rc.pageContext)
                .clientChangeId(rc.clientChangeId)
                .requestId(rc.requestId)
                .ipAddress(rc.ip)
                .build();

        auditRepository.save(ev);
    }

    /** Task -> Project id (epic üzerinden) */
    private static Long extractProjectId(Task t) {
        if (t == null) return null;
        try {
            if (t.getEpic() != null && t.getEpic().getProject() != null) {
                return t.getEpic().getProject().getId();
            }
        } catch (Exception ignored) {}
        return null;
    }

    /** Aynı anda global ve proje-bazlı topic'lere yayınla */
    private void publish(String type, Object payload, Long projectId) {
        TaskEvent evt = new TaskEvent(type, payload);
        // Global kanallar (tüm board/gantt dinleyicileri alır)
        broker.convertAndSend("/topic/tasks", evt);
        broker.convertAndSend("/topic/gantt", evt);

        // Proje bazlı kanallar
        if (projectId != null) {
            broker.convertAndSend("/topic/board." + projectId, evt);
            broker.convertAndSend("/topic/gantt." + projectId, evt);
        }
    }

    private static String nowIso() {
        return OffsetDateTime.now().toString();
    }

    /* ---------------- Payload DTO'ları ---------------- */

    public record TaskStatusChangedPayload(
            Long taskId,
            Long fromStatusId,
            Long toStatusId,
            String at,
            Object snapshot
    ) {}

    public record TaskAssigneesUpdatedPayload(
            Long taskId,
            String at,
            Object snapshot
    ) {}

    public record TaskDatesUpdatedPayload(
            Long taskId,
            String at,
            Object snapshot
    ) {}

    public record TaskDeletedPayload(
            Long taskId,
            String at
    ) {}
}