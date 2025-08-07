package com.taskfoo.taskfoo_backend.repository;

import com.taskfoo.taskfoo_backend.model.Priority;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PriorityRepository extends JpaRepository<Priority, Long> {
}