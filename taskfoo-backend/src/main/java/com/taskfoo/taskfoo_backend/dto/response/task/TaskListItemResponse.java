// dto/response/task/TaskListItemResponse.java
package com.taskfoo.taskfoo_backend.dto.response.task;

import com.taskfoo.taskfoo_backend.dto.response.common.*;
import java.time.LocalDate;
import java.util.List;

public record TaskListItemResponse(
        Long id,
        String title,
        LocalDate startDate,
        LocalDate dueDate,
        IdNameDto status,
        PriorityBriefDto priority,
        IdNameDto epic,
        List<UserBriefDto> assignees,
        Integer version
) {}