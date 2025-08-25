package com.taskfoo.taskfoo_backend.repository;

import com.taskfoo.taskfoo_backend.model.AuditEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditEventRepository extends JpaRepository<AuditEvent, Long> {
    boolean existsByClientChangeId(String clientChangeId);
}