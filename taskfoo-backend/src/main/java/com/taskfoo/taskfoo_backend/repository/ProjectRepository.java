package com.taskfoo.taskfoo_backend.repository;

import com.taskfoo.taskfoo_backend.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectRepository extends JpaRepository<Project, Long> {
}
