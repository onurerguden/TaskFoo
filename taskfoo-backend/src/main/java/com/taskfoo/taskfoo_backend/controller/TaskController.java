package com.taskfoo.taskfoo_backend.controller;

import com.taskfoo.taskfoo_backend.model.Task;
import com.taskfoo.taskfoo_backend.model.User;
import com.taskfoo.taskfoo_backend.repository.UserRepository;
import com.taskfoo.taskfoo_backend.service.TaskService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("api/tasks")
public class TaskController {

    private final TaskService taskService;
    private final UserRepository userRepository;

    public TaskController(TaskService taskService, UserRepository userRepository) {
        this.taskService = taskService;
        this.userRepository = userRepository;
    }

    // GET all tasks
    @GetMapping
    public List<Task> getAllTasks() {
        return taskService.getAllTasks();
    }


    @GetMapping("/{id}")
    public Task getTaskById(@PathVariable Long id) {
        return taskService.getTaskById(id);
    }


    @PostMapping
    public Task createTask(@RequestBody Task task) {
        return taskService.createTask(task);
    }

    // PUT update task
    @PutMapping("/{id}")
    public Task updateTask(@PathVariable Long id, @RequestBody Task task) {
        return taskService.updateTask(id, task);
    }

    // DELETE task
    @DeleteMapping("/{id}")
    public void deleteTask(@PathVariable Long id) {
        taskService.deleteTask(id);
    }

    // PUT assign multiple users to a task
    @PutMapping("/{taskId}/assign-users")
    public Task assignUsersToTask(
            @PathVariable Long taskId,
            @RequestBody List<Long> userIds
    ) {
        Task task = taskService.getTaskById(taskId);
        if (task == null) return null;

        List<User> users = userIds.stream()
                .map(userRepository::findById)
                .filter(Optional::isPresent)
                .map(Optional::get)
                .collect(Collectors.toList());

        task.setAssignedUsers(users);
        return taskService.createTask(task); // re-save with assigned users
    }

    @PatchMapping("/{taskId}/add-user/{userId}")
    public Task addUserToTask(@PathVariable Long taskId, @PathVariable Long userId) {
        Task task = taskService.getTaskById(taskId);
        User user = userRepository.findById(userId).orElse(null);

        if (task == null || user == null) return null;

        List<User> assignedUsers = task.getAssignedUsers();
        if (!assignedUsers.contains(user)) {
            assignedUsers.add(user);
        }

        task.setAssignedUsers(assignedUsers);
        return taskService.createTask(task); // save updated task
    }


    @PatchMapping("/{taskId}/remove-user/{userId}")
    public Task removeUserFromTask(@PathVariable Long taskId, @PathVariable Long userId) {
        Task task = taskService.getTaskById(taskId);
        User user = userRepository.findById(userId).orElse(null);

        if (task == null || user == null) return null;

        task.getAssignedUsers().remove(user);
        return taskService.createTask(task);
    }


    @GetMapping("/search")
    public List<Task> searchTasks(@RequestParam String q) {
        return taskService.searchTasks(q);
    }




    @PatchMapping("/api/tasks/{taskId}/status")
    public ResponseEntity<Task> changeStatus(
            @PathVariable Long taskId,
            @RequestParam Long statusId,
            @RequestParam Integer version) {
        Task updated = taskService.changeStatus(taskId, statusId, version);
        return ResponseEntity.ok(updated);
    }
}