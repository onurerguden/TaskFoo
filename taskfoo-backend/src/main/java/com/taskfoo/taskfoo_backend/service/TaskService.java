package com.taskfoo.taskfoo_backend.service;

import com.taskfoo.taskfoo_backend.model.Status;
import com.taskfoo.taskfoo_backend.model.Task;
import com.taskfoo.taskfoo_backend.model.TaskActivity;
import com.taskfoo.taskfoo_backend.repository.StatusRepository;
import com.taskfoo.taskfoo_backend.repository.TaskActivityRepository;
import com.taskfoo.taskfoo_backend.repository.TaskRepository;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final StatusRepository statusRepository; // Eklendi
    private final TaskActivityRepository taskActivityRepository;

    public TaskService(TaskRepository taskRepository, StatusRepository statusRepository, TaskActivityRepository taskActivityRepository) {
        this.taskRepository = taskRepository;
        this.statusRepository = statusRepository;
        this.taskActivityRepository = taskActivityRepository;
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

    public Task createTask(Task task) {
        return taskRepository.save(task);
    }

    public Task updateTask(Long id, Task updatedTask) {
        Task existingTask = taskRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Task not found"));

        existingTask.setTitle(updatedTask.getTitle());
        existingTask.setDescription(updatedTask.getDescription());
        existingTask.setStatus(updatedTask.getStatus());
        existingTask.setPriority(updatedTask.getPriority());
        existingTask.setEpic(updatedTask.getEpic());
        existingTask.setStartDate(updatedTask.getStartDate());
        existingTask.setDueDate(updatedTask.getDueDate());

        return taskRepository.save(existingTask);
    }

    public void deleteTask(Long id) {
        if (!taskRepository.existsById(id)) {
            throw new EntityNotFoundException("Task not found");
        }
        taskRepository.deleteById(id);
    }

    @Transactional
    public Task changeStatus(Long taskId, Long statusId, Integer version) {
        // 1) Task'ı bul
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));

        // 2) Versiyon kontrolü
        if (!task.getVersion().equals(version)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Task was updated by another user");
        }

        // 3) Eski statü
        Long fromStatusId = (task.getStatus() != null) ? task.getStatus().getId() : null;

        // 4) Yeni statü
        Status newStatus = statusRepository.findById(statusId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status not found"));

        // (Opsiyonel) Aynı statüye geçişse no-op
        if (fromStatusId != null && fromStatusId.equals(newStatus.getId())) {
            return task;
        }

        // 5) Güncelle
        task.setStatus(newStatus);
        taskRepository.saveAndFlush(task); // versiyonu ve updated_at'i hemen günceller

        // 6) Audit kaydı
        TaskActivity activity = new TaskActivity();
        activity.setTaskId(task.getId());
        activity.setFromStatusId(fromStatusId);
        activity.setToStatusId(statusId);
        taskActivityRepository.save(activity);

        // (Opsiyonel) WebSocket broadcast burada yapılabilir

        return task;
    }
}