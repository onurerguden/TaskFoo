package com.taskfoo.taskfoo_backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "task_activity")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TaskActivity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Which task moved */
    @Column(name = "task_id", nullable = false)
    private Long taskId;

    /** From → To status */
    @Column(name = "from_status_id")
    private Long fromStatusId;

    @Column(name = "to_status_id", nullable = false)
    private Long toStatusId;

    /** When it happened */
    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private OffsetDateTime createdAt;
}