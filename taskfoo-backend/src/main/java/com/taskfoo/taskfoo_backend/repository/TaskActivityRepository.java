package com.taskfoo.taskfoo_backend.repository;

import com.taskfoo.taskfoo_backend.model.TaskActivity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaskActivityRepository extends JpaRepository<TaskActivity, Long> {
    List<TaskActivity> findTop50ByTaskIdOrderByCreatedAtDesc(Long taskId);
}