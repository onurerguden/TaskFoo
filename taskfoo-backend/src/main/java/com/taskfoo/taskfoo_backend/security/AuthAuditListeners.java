// src/main/java/com/taskfoo/taskfoo_backend/security/AuthAuditListeners.java
package com.taskfoo.taskfoo_backend.security;

import com.taskfoo.taskfoo_backend.model.AuditEvent;
import com.taskfoo.taskfoo_backend.repository.AuditEventRepository;
import com.taskfoo.taskfoo_backend.support.RequestContext;
import org.springframework.context.event.EventListener;
import org.springframework.security.authentication.event.AbstractAuthenticationFailureEvent;
import org.springframework.security.authentication.event.AuthenticationSuccessEvent;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Optional;

@Component
public class AuthAuditListeners {

    private final AuditEventRepository repo;

    public AuthAuditListeners(AuditEventRepository repo) {
        this.repo = repo;
    }

    @EventListener
    public void onLoginSuccess(AuthenticationSuccessEvent e) {
        var rc = RequestContext.get();
        String name = Optional.ofNullable(e.getAuthentication().getName()).orElse("unknown");

        repo.save(AuditEvent.builder()
                .entityType("AUTH")
                .action(AuditEvent.AuditAction.CREATE)   // istersen enum’a LOGIN_SUCCESS ekleyebilirsin
                .actorName(name)
                .pageContext("AUTH")
                .metadata(Map.of(
                        "event", "LOGIN_SUCCESS",
                        "ip", Optional.ofNullable(rc.ip).orElse("-"),
                        "userAgent", Optional.ofNullable(rc.userAgent).orElse("-")
                ))
                .build());
    }

    @EventListener
    public void onLoginFailure(AbstractAuthenticationFailureEvent e) {
        var rc = RequestContext.get();
        String name = e.getAuthentication() != null ? e.getAuthentication().getName() : "unknown";

        repo.save(AuditEvent.builder()
                .entityType("AUTH")
                .action(AuditEvent.AuditAction.UPDATE)   // istersen enum’a LOGIN_FAILURE ekleyebilirsin
                .actorName(name)
                .pageContext("AUTH")
                .metadata(Map.of(
                        "event", "LOGIN_FAILURE",
                        "reason", e.getException() != null ? e.getException().getClass().getSimpleName() : "-",
                        "ip", Optional.ofNullable(rc.ip).orElse("-"),
                        "userAgent", Optional.ofNullable(rc.userAgent).orElse("-")
                ))
                .build());
    }
}