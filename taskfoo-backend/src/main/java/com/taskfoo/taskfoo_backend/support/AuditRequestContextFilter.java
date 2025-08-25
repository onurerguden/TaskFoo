// src/main/java/com/taskfoo/taskfoo_backend/support/AuditRequestContextFilter.java
package com.taskfoo.taskfoo_backend.support;

import com.taskfoo.taskfoo_backend.security.UserPrincipal;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

@Component("auditRequestContextFilter")
public class AuditRequestContextFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {

        // 1) boş bir context oluştur ve ThreadLocal’a koy
        RequestContext rc = new RequestContext();
        rc.requestId      = Optional.ofNullable(req.getHeader("X-Request-Id"))
                .orElse(UUID.randomUUID().toString());
        rc.clientChangeId = req.getHeader("X-Client-Change-Id");
        rc.pageContext    = Optional.ofNullable(req.getHeader("X-Page-Context")).orElse("API");
        rc.ip             = Optional.ofNullable(req.getHeader("X-Forwarded-For"))
                .orElse(req.getRemoteAddr());
        rc.userAgent      = Optional.ofNullable(req.getHeader("User-Agent")).orElse("-");
        RequestContext.set(rc);

        try {
            // 2) SecurityContext’ten actor bilgisi (JWT filtresi sonrası dolu olur)
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated()) {
                Object p = auth.getPrincipal();
                if (p instanceof UserPrincipal up) {
                    rc.actorId   = up.getUser().getId();
                    rc.actorName = up.getUsername();      // genelde email
                } else {
                    rc.actorName = Optional.ofNullable(auth.getName()).orElse("anonymous");
                }
            }

            // 3) debug için response header
            res.setHeader("X-Request-Id", rc.requestId);

            chain.doFilter(req, res);
        } finally {
            RequestContext.clear();
        }
    }
}