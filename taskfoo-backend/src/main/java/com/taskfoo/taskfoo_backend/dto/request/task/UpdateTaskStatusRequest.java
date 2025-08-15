// dto/request/task/UpdateTaskStatusRequest.java
package com.taskfoo.taskfoo_backend.dto.request.task;

import jakarta.validation.constraints.*;

public record UpdateTaskStatusRequest(
        @NotNull Long statusId,
        @NotNull Integer version
) {}