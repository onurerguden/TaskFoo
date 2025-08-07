package com.taskfoo.taskfoo_backend.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class TaskDTO {
    private Long id;
    private String title;
    private String description;
    private Long statusId;
    private Long priorityId;
    private Long epicId;
    private LocalDate startDate;
    private LocalDate dueDate;
    private LocalDateTime createdAt;

    private List<Long> assignedUserIds; // task_user
}