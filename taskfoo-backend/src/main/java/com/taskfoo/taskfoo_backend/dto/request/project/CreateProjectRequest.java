// src/main/java/com/taskfoo/taskfoo_backend/dto/request/project/CreateProjectRequest.java
package com.taskfoo.taskfoo_backend.dto.request.project;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

public record CreateProjectRequest(
        @NotBlank String name,
        String description,
        LocalDate startDate,
        LocalDate dueDate
) {}