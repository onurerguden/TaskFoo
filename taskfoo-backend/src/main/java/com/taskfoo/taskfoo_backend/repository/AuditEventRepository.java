// src/main/java/com/taskfoo/taskfoo_backend/repository/AuditEventRepository.java
package com.taskfoo.taskfoo_backend.repository;

import com.taskfoo.taskfoo_backend.model.AuditEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AuditEventRepository
        extends JpaRepository<AuditEvent, Long>, JpaSpecificationExecutor<AuditEvent> {
}