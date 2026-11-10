package com.taskfoo.taskfoo_backend.assistant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "assistant_proposal")
class Proposal {
    @Id
    UUID id;
    long actorId;
    long projectId;
    Instant expiresAt;
    @Column(nullable = false, columnDefinition = "text")
    String command;
    Long resultTaskId;

    protected Proposal() {}

    Proposal(long actorId, long projectId, String command) {
        this.id = UUID.randomUUID();
        this.actorId = actorId;
        this.projectId = projectId;
        this.command = command;
        this.expiresAt = Instant.now().plusSeconds(600);
    }
}
