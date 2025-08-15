// dto/request/task/AssignUsersRequest.java
package com.taskfoo.taskfoo_backend.dto.request.task;

import jakarta.validation.constraints.*;
import java.util.List;

public record AssignUsersRequest(
        @NotEmpty List<Long> userIds,
        @NotNull Integer version
) {}