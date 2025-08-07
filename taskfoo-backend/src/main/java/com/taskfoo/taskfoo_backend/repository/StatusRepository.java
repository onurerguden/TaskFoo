package com.taskfoo.taskfoo_backend.repository;

import com.taskfoo.taskfoo_backend.model.Status;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StatusRepository extends JpaRepository<Status, Long> {
}