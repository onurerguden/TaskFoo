// src/main/java/com/taskfoo/taskfoo_backend/security/AuditLogoutSuccessHandler.java
package com.taskfoo.taskfoo_backend.security;

import com.taskfoo.taskfoo_backend.model.AuditEvent;
import com.taskfoo.taskfoo_backend.repository.AuditEventRepository;
import com.taskfoo.taskfoo_backend.support.RequestContext;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.logout.LogoutSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;
import java.util.Optional;

@Component
public class AuditLogoutSuccessHandler implements LogoutSuccessHandler {

    private final AuditEventRepository repo;

    public AuditLogoutSuccessHandler(AuditEventRepository repo) {
        this.repo = repo;
    }

    @Override
    public void onLogoutSuccess(HttpServletRequest request,
                                HttpServletResponse response,
                                Authentication authentication) throws IOException, ServletException {
        var rc = RequestContext.get();
        String name = authentication != null ? authentication.getName() : "unknown";

        repo.save(AuditEvent.builder()
                .entityType("AUTH")
                .action(AuditEvent.AuditAction.DELETE)   // istersen enum’a LOGOUT ekleyebilirsin
                .actorName(name)
                .pageContext("AUTH")
                .metadata(Map.of(
                        "event", "LOGOUT",
                        "ip", Optional.ofNullable(rc.ip).orElse("-"),
                        "userAgent", Optional.ofNullable(rc.userAgent).orElse("-")
                ))
                .build());

        // Varsayılan davranış: 200/redirect’ini sen belirle (gerekirse)
        response.setStatus(HttpServletResponse.SC_OK);
    }
}