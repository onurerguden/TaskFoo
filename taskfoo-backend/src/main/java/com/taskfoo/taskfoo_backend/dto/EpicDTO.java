package com.taskfoo.taskfoo_backend.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class EpicDTO {
    private Long id;
    private String name;
    private String description;
    private Long projectId;
    private LocalDate startDate;
    private LocalDate dueDate;
    private LocalDateTime createdAt;
}