package com.taskfoo.taskfoo_backend.dto.response.epic;

import com.taskfoo.taskfoo_backend.dto.response.common.IdNameDto;

import java.time.LocalDate;

public record EpicDto(
        Long id,
        String name,
        String description,
        LocalDate startDate,
        LocalDate dueDate,
        java.time.LocalDateTime createdAt,
        IdNameDto project   // {id,name}
) {}