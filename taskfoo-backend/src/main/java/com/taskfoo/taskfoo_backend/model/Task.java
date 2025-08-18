package com.taskfoo.taskfoo_backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;

@Entity
@Table(name = "tasks")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private String description;

    private LocalDate startDate;
    private LocalDate dueDate;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;

    @ManyToOne @JoinColumn(name = "status_id")
    private Status status;

    @ManyToOne @JoinColumn(name = "priority_id")
    private Priority priority;

    @ManyToOne @JoinColumn(name = "epic_id")
    private Epic epic;

    
    @ManyToMany
    @JoinTable(
            name = "task_user",
            joinColumns = @JoinColumn(name = "task_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    private List<User> assignedUsers;

    @Version              // optimistic concurrency
    private Integer version;

    @Column(name="updated_at")
    private OffsetDateTime updatedAt;

    @PreUpdate
    public void onUpdate() { this.updatedAt = OffsetDateTime.now(); }
}