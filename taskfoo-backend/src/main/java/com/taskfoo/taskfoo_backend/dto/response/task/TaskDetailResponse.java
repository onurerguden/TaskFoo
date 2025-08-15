package com.taskfoo.taskfoo_backend.dto.response.task;

import com.taskfoo.taskfoo_backend.dto.response.common.IdNameDto;
import com.taskfoo.taskfoo_backend.dto.response.common.PriorityBriefDto;
import com.taskfoo.taskfoo_backend.dto.response.common.UserBriefDto;

import java.time.LocalDate;
import java.util.List;

public record TaskDetailResponse(
        Long id,
        String title,
        String description,
        LocalDate startDate,
        LocalDate dueDate,
        IdNameDto status,
        PriorityBriefDto priority,
        IdNameDto epic,
        List<UserBriefDto> assignees,
        Integer version
) {}