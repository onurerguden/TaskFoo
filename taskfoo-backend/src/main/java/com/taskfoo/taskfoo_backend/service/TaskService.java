package com.taskfoo.taskfoo_backend.service;

import com.taskfoo.taskfoo_backend.model.Status;
import com.taskfoo.taskfoo_backend.model.Task;
import com.taskfoo.taskfoo_backend.repository.StatusRepository;
import com.taskfoo.taskfoo_backend.repository.TaskRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;
import jakarta.persistence.EntityNotFoundException;

import java.util.List;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final StatusRepository statusRepository; // 💡 Eklendi

    public TaskService(TaskRepository taskRepository, StatusRepository statusRepository) {
        this.taskRepository = taskRepository;
        this.statusRepository = statusRepository;
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
    public Task changeStatus(Long taskId, Long statusId) {
        Task t = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));
        Status s = statusRepository.findById(statusId) // 💡 Düzelttik
                .orElseThrow(() -> new RuntimeException("Status not found"));
        t.setStatus(s);
        return taskRepository.save(t);
    }
}