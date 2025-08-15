package com.taskfoo.taskfoo_backend.dto.response.Project;

import java.time.LocalDate;

public record ProjectDto(
        Long id,
        String name,
        String description,
        LocalDate startDate,
        LocalDate dueDate,
        java.time.LocalDateTime createdAt
) {}