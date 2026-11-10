package com.taskfoo.taskfoo_backend.assistant;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskfoo.taskfoo_backend.model.*;
import com.taskfoo.taskfoo_backend.repository.*;
import com.taskfoo.taskfoo_backend.support.RequestContext;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import com.taskfoo.taskfoo_backend.security.JwtService;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@SpringBootTest
@AutoConfigureMockMvc
class AssistantIntegrationTest {
    @Autowired AssistantService assistant;
    @Autowired ObjectMapper json;
    @Autowired TaskRepository tasks;
    @Autowired ProjectRepository projects;
    @Autowired EpicRepository epics;
    @Autowired StatusRepository statuses;
    @Autowired PriorityRepository priorities;
    @Autowired UserRepository users;
    @Autowired AuditEventRepository audit;
    @Autowired JdbcTemplate database;
    @Autowired MockMvc mvc;
    @Autowired JwtService jwt;
    @MockitoBean AssistantModel model;

    long actor;
    long project;
    long otherProject;
    long task;
    long otherTask;
    String next;
    String priority;

    @BeforeEach
    void seed() {
        String suffix = UUID.randomUUID().toString();
        User user = new User();
        user.setName("Test");
        user.setEmail(suffix + "@example.test");
        user.setPassword("fixture");
        user.setRoles(Set.of(Role.PM));
        actor = users.save(user).getId();
        var todo = statuses.save(new Status(null, "Todo-" + suffix));
        var done = statuses.save(new Status(null, "Done-" + suffix));
        next = done.getName();
        priority = priorities.save(new Priority(null, "High-" + suffix, "red")).getName();
        var first = taskInProject("First-" + suffix, todo);
        var second = taskInProject("Second-" + suffix, todo);
        task = first.getId();
        otherTask = second.getId();
        project = first.getEpic().getProject().getId();
        otherProject = second.getEpic().getProject().getId();
    }

    @Test
    void scopesReadAndRejectsUnknownFieldsWithoutWriting() throws Exception {
        stub("search_tasks", "{\"title\":\"Report\"}");
        assertThat(assistant.chat(actor, project, "find").tasks()).extracting(AssistantService.Match::id)
            .containsExactly(task);
        assertThat(assistant.chat(actor, otherProject, "find").tasks()).extracting(AssistantService.Match::id)
            .containsExactly(otherTask);
        stub("change_status", "{\"title\":\"Report\",\"status\":\"" + next + "\",\"projectId\":" + otherProject + "}");
        assertThat(assistant.chat(actor, project, "untrusted").kind()).isEqualTo("clarify");
    }

    @Test
    void concurrentConfirmCommitsExactlyOneAuditAndLeavesOtherProjectAlone() throws Exception {
        UUID id = statusProposal();
        assertThat(tasks.findById(task).orElseThrow().getStatus().getName()).startsWith("Todo-");
        long count = audit.count();
        var gate = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var a = executor.submit(() -> { gate.await(); return confirm(id); });
            var b = executor.submit(() -> { gate.await(); return confirm(id); });
            gate.countDown();
            assertThat(a.get(10, TimeUnit.SECONDS)).isEqualTo(b.get(10, TimeUnit.SECONDS));
        }
        assertThat(audit.count()).isEqualTo(count + 1);
        assertThat(tasks.findById(task).orElseThrow().getStatus().getName()).isEqualTo(next);
        assertThat(tasks.findById(otherTask).orElseThrow().getStatus().getName()).startsWith("Todo-");
    }

    @Test
    void rechecksRoleAndRejectsStaleOrForeignTarget() throws Exception {
        UUID id = statusProposal();
        var user = users.findById(actor).orElseThrow();
        user.setRoles(Set.of(Role.DEV));
        users.save(user);
        assertThatThrownBy(() -> confirm(id)).isInstanceOfSatisfying(ResponseStatusException.class,
            error -> assertThat(error.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN));
        user.setRoles(Set.of(Role.PM));
        users.save(user);
        var changed = tasks.findById(task).orElseThrow();
        changed.setDescription("changed outside the preview");
        tasks.saveAndFlush(changed);
        assertThatThrownBy(() -> confirm(id)).isInstanceOfSatisfying(ResponseStatusException.class,
            error -> assertThat(error.getStatusCode()).isEqualTo(HttpStatus.CONFLICT));
        stub("update_task", "{\"title\":\"No such title in this project\",\"newTitle\":\"Untrusted\"}");
        assertThat(assistant.chat(actor, project, "outside").kind()).isEqualTo("clarify");
    }

    @Test
    void rollsBackTaskAndKeepsProposalRetryableWhenAuditFails() throws Exception {
        UUID id = statusProposal();
        database.execute("alter table audit_event add constraint reject_fixture check "
            + "(client_change_id is distinct from '" + id + "') not valid");
        try {
            assertThatThrownBy(() -> confirm(id)).isInstanceOf(DataIntegrityViolationException.class);
            assertThat(tasks.findById(task).orElseThrow().getStatus().getName()).startsWith("Todo-");
        } finally {
            database.execute("alter table audit_event drop constraint reject_fixture");
        }
        assertThat(confirm(id).taskId()).isEqualTo(task);
    }

    @Test
    void createAndUpdateUseValidatedFieldsAndPersist() throws Exception {
        stub("create_task", json.writeValueAsString(java.util.Map.of(
            "title", "New report", "epic", "Delivery", "status", next, "priority", priority,
            "startDate", "2026-11-10", "dueDate", "2026-11-12")));
        var newTask = confirm(assistant.chat(actor, project, "Create New report in Delivery with " + next + " and " + priority + " from 2026-11-10 to 2026-11-12").preview().id()).taskId();
        stub("update_task", "{\"title\":\"New report\",\"newTitle\":\"Reviewed report\"}");
        confirm(assistant.chat(actor, project, "Rename New report to Reviewed report").preview().id());
        assertThat(tasks.findById(newTask).orElseThrow().getTitle()).isEqualTo("Reviewed report");
    }

    @Test
    void projectNamesAndExplicitValuesAreCheckedBeforeProposal() throws Exception {
        String foreign = projects.findById(otherProject).orElseThrow().getName();
        stub("change_status", "{\"title\":\"Report\",\"status\":\"" + next + "\"}");
        assertThat(assistant.chat(actor, project, "Move Report in " + foreign + " to " + next).kind())
            .isEqualTo("clarify");
        assertThat(assistant.chat(actor, project, "Move Report").kind()).isEqualTo("clarify");
    }

    @Test
    void nonAdminCannotChangeTheirRoleOverHttp() throws Exception {
        String email = users.findById(actor).orElseThrow().getEmail();
        mvc.perform(put("/api/users/" + actor + "/roles")
                .header("Authorization", "Bearer " + jwt.generate(email, java.util.Map.of()))
                .contentType("application/json").content("{\"roles\":[\"ADMIN\"]}"))
            .andExpect(status().isForbidden());
        assertThat(users.findById(actor).orElseThrow().getRoles()).containsExactly(Role.PM);
    }

    private UUID statusProposal() throws Exception {
        stub("change_status", "{\"title\":\"Report\",\"status\":\"" + next + "\"}");
        return assistant.chat(actor, project, "Move Report to " + next).preview().id();
    }

    private AssistantService.Receipt confirm(UUID id) {
        var context = new RequestContext();
        context.actorId = actor;
        context.pageContext = "ASSISTANT";
        RequestContext.set(context);
        try {
            return assistant.confirm(actor, id);
        } finally {
            RequestContext.clear();
        }
    }

    private void stub(String tool, String args) throws Exception {
        when(model.toolCalls(anyString(), anyBoolean())).thenReturn(
            json.readTree("[{\"function\":{\"name\":\"" + tool + "\",\"arguments\":" + args + "}}]"));
    }

    private Task taskInProject(String name, Status status) {
        var parent = new Project();
        parent.setName(name);
        parent = projects.save(parent);
        var epic = new Epic();
        epic.setName("Delivery");
        epic.setProject(parent);
        epic = epics.save(epic);
        var item = new Task();
        item.setTitle("Report");
        item.setEpic(epic);
        item.setStatus(status);
        return tasks.save(item);
    }
}
