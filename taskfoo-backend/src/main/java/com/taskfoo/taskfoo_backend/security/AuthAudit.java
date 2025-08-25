// src/main/java/com/taskfoo/taskfoo_backend/security/AuthAudit.java
package com.taskfoo.taskfoo_backend.security;

import com.taskfoo.taskfoo_backend.model.AuditEvent;
import com.taskfoo.taskfoo_backend.repository.AuditEventRepository;
import com.taskfoo.taskfoo_backend.support.RequestContext;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Optional;

@Component
public class AuthAudit {
    private final AuditEventRepository repo;

    public AuthAudit(AuditEventRepository repo) { this.repo = repo; }

    public void loginSuccess(Long userId, String username) {
        var rc = RequestContext.get();
        repo.save(AuditEvent.builder()
                .entityType("AUTH")
                .entityId(userId)
                .action(AuditEvent.AuditAction.LOGIN_SUCCESS)
                .actorId(userId)
                .actorName(username)
                .pageContext("AUTH")
                .metadata(Map.of(
                        "event", "LOGIN_SUCCESS",
                        "ip", Optional.ofNullable(rc.ip).orElse("-"),
                        "userAgent", Optional.ofNullable(rc.userAgent).orElse("-")
                ))
                .build());
    }

    public void loginFailure(String username, String reason) {
        var rc = RequestContext.get();
        repo.save(AuditEvent.builder()
                .entityType("AUTH")
                .action(AuditEvent.AuditAction.LOGIN_FAILURE)
                .actorName(username)
                .pageContext("AUTH")
                .metadata(Map.of(
                        "event", "LOGIN_FAILURE",
                        "reason", Optional.ofNullable(reason).orElse("-"),
                        "ip", Optional.ofNullable(rc.ip).orElse("-"),
                        "userAgent", Optional.ofNullable(rc.userAgent).orElse("-")
                ))
                .build());
    }

    public void logout(Long userId, String username) {
        var rc = RequestContext.get();
        repo.save(AuditEvent.builder()
                .entityType("AUTH")
                .entityId(userId)
                .action(AuditEvent.AuditAction.LOGOUT)
                .actorId(userId)
                .actorName(username)
                .pageContext("AUTH")
                .metadata(Map.of(
                        "event", "LOGOUT",
                        "ip", Optional.ofNullable(rc.ip).orElse("-"),
                        "userAgent", Optional.ofNullable(rc.userAgent).orElse("-")
                ))
                .build());
    }
}