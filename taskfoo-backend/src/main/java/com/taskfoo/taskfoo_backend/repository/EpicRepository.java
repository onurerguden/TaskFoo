package com.taskfoo.taskfoo_backend.repository;

import com.taskfoo.taskfoo_backend.model.Epic;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EpicRepository extends JpaRepository<Epic, Long> {
}