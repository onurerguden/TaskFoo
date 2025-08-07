package com.taskfoo.taskfoo_backend.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class CreateProjectRequest {
    private String name;
    private String description;
    private LocalDate startDate;
    private LocalDate dueDate;
}