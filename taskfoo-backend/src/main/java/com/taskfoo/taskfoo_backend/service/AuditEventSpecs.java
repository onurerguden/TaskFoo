// src/main/java/com/taskfoo/taskfoo_backend/service/AuditEventSpecs.java
package com.taskfoo.taskfoo_backend.service;

import com.taskfoo.taskfoo_backend.model.AuditEvent;
import com.taskfoo.taskfoo_backend.model.AuditEvent.AuditAction;
import org.springframework.data.jpa.domain.Specification;

import java.time.OffsetDateTime;

public class AuditEventSpecs {

    public static Specification<AuditEvent> createdAtGte(OffsetDateTime from) {
        return (root, q, cb) -> from == null ? null : cb.greaterThanOrEqualTo(root.get("createdAt"), from);
    }

    public static Specification<AuditEvent> createdAtLte(OffsetDateTime to) {
        return (root, q, cb) -> to == null ? null : cb.lessThanOrEqualTo(root.get("createdAt"), to);
    }

    public static Specification<AuditEvent> actionIs(AuditAction action) {
        return (root, q, cb) -> action == null ? null : cb.equal(root.get("action"), action);
    }

    public static Specification<AuditEvent> entityTypeIs(String entityType) {
        return (root, q, cb) -> (entityType == null || entityType.isBlank()) ? null
                : cb.equal(root.get("entityType"), entityType);
    }

    /** Serbest metin araması (actorName, ipAddress, requestId, pageContext, entityType) */
    public static Specification<AuditEvent> textSearch(String qStr) {
        return (root, q, cb) -> {
            if (qStr == null || qStr.isBlank()) return null;
            String like = "%" + qStr.trim().toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("actorName")), like),
                    cb.like(cb.lower(root.get("ipAddress")), like),
                    cb.like(cb.lower(root.get("requestId")), like),
                    cb.like(cb.lower(root.get("pageContext")), like),
                    cb.like(cb.lower(root.get("entityType")), like)
            );
        };
    }
}