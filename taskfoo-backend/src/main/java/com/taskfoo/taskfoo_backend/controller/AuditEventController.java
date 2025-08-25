// src/main/java/com/taskfoo/taskfoo_backend/controller/AuditEventController.java
package com.taskfoo.taskfoo_backend.controller;

import com.taskfoo.taskfoo_backend.model.AuditEvent;
import com.taskfoo.taskfoo_backend.model.AuditEvent.AuditAction;
import com.taskfoo.taskfoo_backend.repository.AuditEventRepository;
import com.taskfoo.taskfoo_backend.service.AuditEventSpecs;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/audit-events")
public class AuditEventController {

    private final AuditEventRepository repo;

    public AuditEventController(AuditEventRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to,
            @RequestParam(required = false) AuditAction action, // "ALL" gelirse frontend göndermiyor
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false, defaultValue = "") String q,
            @RequestParam(required = false, defaultValue = "0") Integer page,   // backend 0-index
            @RequestParam(required = false, defaultValue = "20") Integer size
    ) {
        Pageable pageable = PageRequest.of(
                Math.max(0, page),
                Math.max(1, size),
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"))
        );

        Specification<AuditEvent> spec = Specification.allOf(
                AuditEventSpecs.createdAtGte(from),
                AuditEventSpecs.createdAtLte(to),
                AuditEventSpecs.actionIs(action),
                AuditEventSpecs.entityTypeIs(entityType),
                AuditEventSpecs.textSearch(q)
        );

        Page<AuditEvent> p = repo.findAll(spec, pageable);

        Map<String, Object> body = new HashMap<>();
        body.put("content", p.getContent());
        body.put("total", p.getTotalElements()); // frontend `total` bekliyor
        return ResponseEntity.ok(body);
    }
}