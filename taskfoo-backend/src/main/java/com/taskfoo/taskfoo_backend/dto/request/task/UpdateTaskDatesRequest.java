// src/main/java/com/taskfoo/taskfoo_backend/dto/request/task/UpdateTaskDatesRequest.java
package com.taskfoo.taskfoo_backend.dto.request.task;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record UpdateTaskDatesRequest(
        @NotNull LocalDate startDate,
        @NotNull LocalDate dueDate
      //  @NotNull Long version   // optimistic locking
) {}