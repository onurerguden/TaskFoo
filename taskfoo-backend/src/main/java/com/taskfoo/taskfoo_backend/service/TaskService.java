// src/main/java/com/taskfoo/taskfoo_backend/service/TaskService.java
package com.taskfoo.taskfoo_backend.service;

import com.taskfoo.taskfoo_backend.model.*;
import com.taskfoo.taskfoo_backend.repository.TaskActivityRepository;
import com.taskfoo.taskfoo_backend.repository.TaskRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final TaskActivityRepository taskActivityRepository;
    private final SimpMessagingTemplate broker;

    public TaskService(TaskRepository taskRepository,
                       TaskActivityRepository taskActivityRepository,
                       SimpMessagingTemplate broker) {
        this.taskRepository = taskRepository;
        this.taskActivityRepository = taskActivityRepository;
        this.broker = broker;
    }

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

    @Transactional
    public Task createTask(Task task) {
        Task saved = taskRepository.save(task);

        // Audit: created
        TaskActivity activity = new TaskActivity();
        activity.setTaskId(saved.getId());
        activity.setFromStatusId(TaskActivity.STATUS_CREATED);
        activity.setToStatusId(saved.getStatus() != null ? saved.getStatus().getId() : TaskActivity.STATUS_NONE);
        taskActivityRepository.save(activity);

        // WS
        broker.convertAndSend("/topic/tasks", new TaskEvent("TASK_CREATED", saved));
        return saved;
    }

    // Genel amaçlı save (PUT update sonrası)
    @Transactional
    public Task save(Task task) {
        Task saved = taskRepository.saveAndFlush(task);
        broker.convertAndSend("/topic/tasks", new TaskEvent("TASK_UPDATED", saved));
        return saved;
    }

    @Transactional
    public void deleteTask(Long id) {
        Task existingTask = getTaskById(id);

        TaskActivity activity = new TaskActivity();
        activity.setTaskId(existingTask.getId());
        activity.setFromStatusId(existingTask.getStatus() != null ? existingTask.getStatus().getId() : TaskActivity.STATUS_NONE);
        activity.setToStatusId(TaskActivity.STATUS_DELETED);
        taskActivityRepository.save(activity);

        taskRepository.delete(existingTask);
        broker.convertAndSend("/topic/tasks", new TaskEvent("TASK_DELETED", existingTask));
    }

    @Transactional
    public Task changeStatus(Long taskId, Long statusId, Integer version) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));

        if (!task.getVersion().equals(version)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Task was updated by another user");
        }

        Long fromStatusId = (task.getStatus() != null) ? task.getStatus().getId() : null;

        // Status'i controller yükledi, burada sadece id set'i beklemiyoruz; controller'dan entity geldiği için
        // bu methodun imzasını değiştirmedik; statusId değişikliğini repository tarafında trigger'lıyoruz:
        Status newStatus = new Status();
        newStatus.setId(statusId);

        if (fromStatusId != null && fromStatusId.equals(newStatus.getId())) {
            return task;
        }

        task.setStatus(newStatus);
        taskRepository.saveAndFlush(task);

        TaskActivity activity = new TaskActivity();
        activity.setTaskId(task.getId());
        activity.setFromStatusId(fromStatusId);
        activity.setToStatusId(statusId);
        taskActivityRepository.save(activity);

        broker.convertAndSend("/topic/tasks", new TaskEvent("TASK_STATUS_CHANGED", task));
        return task;
    }

    @Transactional
    public Task replaceAssignees(Task task, List<User> users, Integer version) {
        if (!task.getVersion().equals(version)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Task was updated by another user");
        }
        task.setAssignedUsers(users);
        Task saved = taskRepository.saveAndFlush(task);
        broker.convertAndSend("/topic/tasks", new TaskEvent("TASK_UPDATED", saved));
        return saved;
    }


    @Transactional
    public Task updateTaskDates(Long id, LocalDate startDate, LocalDate dueDate, Long version) {
        Task t = taskRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Task not found: " + id));

        if (!Objects.equals(t.getVersion(), version)) {
            throw new OptimisticLockingFailureException("Version conflict for task " + id);
        }
        if (dueDate.isBefore(startDate)) {
            throw new IllegalArgumentException("dueDate cannot be before startDate");
        }

        t.setStartDate(startDate);
        t.setDueDate(dueDate);
        // JPA @Version alanı otomatik artacak
        return taskRepository.save(t);
    }




}