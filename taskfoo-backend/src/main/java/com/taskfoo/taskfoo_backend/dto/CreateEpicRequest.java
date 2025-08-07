package com.taskfoo.taskfoo_backend.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class CreateEpicRequest {
    private String name;
    private String description;
    private Long projectId;
    private LocalDate startDate;
    private LocalDate dueDate;
}