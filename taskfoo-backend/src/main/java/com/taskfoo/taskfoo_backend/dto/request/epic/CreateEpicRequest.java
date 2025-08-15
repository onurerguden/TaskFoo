// src/main/java/com/taskfoo/taskfoo_backend/dto/request/epic/CreateEpicRequest.java
package com.taskfoo.taskfoo_backend.dto.request.epic;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record CreateEpicRequest(
        @NotBlank String name,
        String description,
        Long projectId,                 // opsiyonel
        @NotNull LocalDate startDate,
        @NotNull LocalDate dueDate
) {}