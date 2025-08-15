
// dto/request/task/UpdateTaskRequest.java
package com.taskfoo.taskfoo_backend.dto.request.task;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record UpdateTaskRequest(
        @NotNull Long id,
        @NotNull Integer version,   // entity'de Integer gördüğün için Integer kullandım
        String title,
        String description,
        LocalDate startDate,
        LocalDate dueDate,
        Long statusId,
        Long priorityId,
        Long epicId,
        List<Long> assigneeIds
) {}