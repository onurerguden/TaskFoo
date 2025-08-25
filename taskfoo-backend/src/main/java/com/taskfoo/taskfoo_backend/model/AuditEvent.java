package com.taskfoo.taskfoo_backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Entity
@Table(
        name = "audit_event",
        indexes = {
                @Index(name = "idx_audit_entity", columnList = "entity_type, entity_id, created_at"),
                @Index(name = "idx_audit_action", columnList = "action, created_at"),
                @Index(name = "idx_audit_actor",  columnList = "actor_id, created_at"),
                @Index(name = "idx_audit_client_change", columnList = "client_change_id"),
                @Index(name = "idx_audit_request", columnList = "request_id")
        }
)
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Hangi varlık: TASK, EPIC, PROJECT ... */
    @Column(name = "entity_type", nullable = false, length = 64)
    private String entityType;

    /** Varlık id */
    @Column(name = "entity_id", nullable = false)
    private Long entityId;

    /** Ne oldu? CREATE, UPDATE, DELETE, MOVE, ASSIGN ... */
    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false, length = 32)
    private AuditAction action;

    /** Alan bazlı değişiklikler (opsiyonel) */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "changed_fields", columnDefinition = "jsonb")
    private List<ChangedField> changedFields;

    /** Ek meta (opsiyonel) */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    private Map<String, Object> metadata;

    /** Aktör bilgisi (opsiyonel) */
    @Column(name = "actor_id")
    private Long actorId;

    @Column(name = "actor_name", length = 128)
    private String actorName;

    /** BOARD | GANTT | API | CRON ... (opsiyonel) */
    @Column(name = "page_context", length = 32)
    private String pageContext;

    /** Idempotency (opsiyonel): X-Client-Change-Id */
    @Column(name = "client_change_id", length = 64)
    private String clientChangeId;

    /** Trace (opsiyonel) */
    @Column(name = "request_id", length = 64)
    private String requestId;

    /** IP (opsiyonel) */
    @Column(name = "ip_address", length = 64)
    private String ipAddress;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void defaults() {
        if (pageContext == null) pageContext = "API";
    }

    /* ----- İç tipler ----- */

    public enum AuditAction {
        CREATE, UPDATE, DELETE, MOVE, ASSIGN, UNASSIGN, LINK, UNLINK, ARCHIVE, RESTORE, LOGIN_SUCCESS,
        LOGIN_FAILURE,
        LOGOUT
    }

    @Getter @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChangedField {
        private String field;
        private Object oldValue;
        private Object newValue;
    }
}