package com.taskfoo.taskfoo_backend.dto;

import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class CreateTaskRequest {
    private String title;
    private String description;
    private Long statusId;
    private Long priorityId;
    private Long epicId;
    private LocalDate startDate;
    private LocalDate dueDate;
    private List<Long> assignedUserIds;
}