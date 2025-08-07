package com.taskfoo.taskfoo_backend.repository;

import com.taskfoo.taskfoo_backend.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskRepository extends JpaRepository<Task, Long> {
}