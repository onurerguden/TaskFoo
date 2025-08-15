
// dto/request/task/CreateTaskRequest.java
package com.taskfoo.taskfoo_backend.dto.request.task;

import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.List;

public record CreateTaskRequest(
        @NotBlank String title,
        @Size(max = 10_000) String description,
        @NotNull LocalDate startDate,
        @NotNull LocalDate dueDate,
        @NotNull Long statusId,
        @NotNull Long priorityId,
        Long epicId,
        List<Long> assigneeIds
) {}