package com.taskfoo.taskfoo_backend.repository;

import com.taskfoo.taskfoo_backend.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findTop10ByEpic_Project_IdAndTitleContainingIgnoreCaseOrderById(long projectId, String title);
    List<Task> findTop2ByEpic_Project_IdAndTitleIgnoreCaseOrderById(long projectId, String title);
    Optional<Task> findByIdAndEpic_Project_Id(long id, long projectId);
    List<Task> findByTitleContainingIgnoreCase(String title);
}