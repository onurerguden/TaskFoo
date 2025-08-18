// src/main/java/com/taskfoo/taskfoo_backend/controller/TaskController.java
package com.taskfoo.taskfoo_backend.controller;

import com.taskfoo.taskfoo_backend.dto.request.task.*;
import com.taskfoo.taskfoo_backend.dto.response.task.TaskListItemResponse;
import com.taskfoo.taskfoo_backend.mapper.TaskMapper;
import com.taskfoo.taskfoo_backend.model.*;
import com.taskfoo.taskfoo_backend.repository.*;
import com.taskfoo.taskfoo_backend.service.TaskService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("api/tasks")
public class TaskController {

    private final TaskService taskService;
    private final StatusRepository statusRepository;
    private final PriorityRepository priorityRepository;
    private final EpicRepository epicRepository;
    private final UserRepository userRepository;
    private final TaskMapper mapper;

    public TaskController(TaskService taskService,
                          StatusRepository statusRepository,
                          PriorityRepository priorityRepository,
                          EpicRepository epicRepository,
                          UserRepository userRepository,
                          TaskMapper mapper) {
        this.taskService = taskService;
        this.statusRepository = statusRepository;
        this.priorityRepository = priorityRepository;
        this.epicRepository = epicRepository;
        this.userRepository = userRepository;
        this.mapper = mapper;
    }

    // LIST
    @GetMapping
    public List<TaskListItemResponse> getAll() {
        return taskService.getAllTasks().stream()
                .map(mapper::toListItem)
                .toList();
    }

    // GET by id (liste item dto dönüyoruz — şimdilik tek dto)
    @GetMapping("/{id}")
    public TaskListItemResponse getById(@PathVariable Long id) {
        Task t = taskService.getTaskById(id);
        return mapper.toListItem(t);
    }

    // CREATE (DTO in, DTO out)
    @PostMapping
    public TaskListItemResponse create(@Valid @RequestBody CreateTaskRequest req) {
        Status status   = (req.statusId()   != null) ? statusRepository.findById(req.statusId()).orElse(null) : null;
        Priority priority = (req.priorityId() != null) ? priorityRepository.findById(req.priorityId()).orElse(null) : null;
        Epic epic       = (req.epicId()     != null) ? epicRepository.findById(req.epicId()).orElse(null) : null;
        List<User> assignees = (req.assigneeIds() == null || req.assigneeIds().isEmpty())
                ? List.of()
                : userRepository.findAllById(req.assigneeIds());

        Task t = new Task();
        mapper.applyCreate(t, req, status, priority, epic, assignees);
        Task saved = taskService.createTask(t);
        return mapper.toListItem(saved);
    }

    @PatchMapping("/{id}/dates")
    public TaskListItemResponse updateDates(@PathVariable Long id,
                                            @RequestBody @Valid UpdateTaskDatesRequest body) {

        Task updated = taskService.updateTaskDates(id, body.startDate(), body.dueDate(), body.version());
        return mapper.toListItem(updated); 
    }

    // UPDATE (partial update dto)
    @PutMapping("/{id}")
    public TaskListItemResponse update(@PathVariable Long id, @Valid @RequestBody UpdateTaskRequest req) {
        Status status   = (req.statusId()   != null) ? statusRepository.findById(req.statusId()).orElse(null) : null;
        Priority priority = (req.priorityId() != null) ? priorityRepository.findById(req.priorityId()).orElse(null) : null;
        Epic epic       = (req.epicId()     != null) ? epicRepository.findById(req.epicId()).orElse(null) : null;
        List<User> assignees = (req.assigneeIds() == null) ? null : userRepository.findAllById(req.assigneeIds());

        Task existing = taskService.getTaskById(id);
        mapper.applyUpdate(existing, req, status, priority, epic, assignees);
        Task saved = taskService.save(existing);
        return mapper.toListItem(saved);
    }

    // DELETE
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        taskService.deleteTask(id);
        return ResponseEntity.noContent().build();
    }

    // ASSIGN MULTIPLE USERS (DTO in, DTO out)
    @PutMapping("/{taskId}/assign-users")
    public TaskListItemResponse assignUsers(@PathVariable Long taskId,
                                            @Valid @RequestBody AssignUsersRequest req) {
        Task task = taskService.getTaskById(taskId);
        List<User> users = userRepository.findAllById(req.userIds());
        // versiyon çakışması varsa service içinde yakalayacağız
        Task saved = taskService.replaceAssignees(task, users, req.version());
        return mapper.toListItem(saved);
    }

    // CHANGE STATUS (body JSON //api/tasks/{id}/status)
    @PatchMapping("/{taskId}/status")
    public TaskListItemResponse changeStatus(@PathVariable Long taskId,
                                             @Valid @RequestBody UpdateTaskStatusRequest req) {
        Task updated = taskService.changeStatus(taskId, req.statusId(), req.version());
        return mapper.toListItem(updated);
    }

    // SEARCH (liste dto)
    @GetMapping("/search")
    public List<TaskListItemResponse> search(@RequestParam String q) {
        return taskService.searchTasks(q).stream()
                .map(mapper::toListItem)
                .toList();
    }
}