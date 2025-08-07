package com.taskfoo.taskfoo_backend.dto;

import lombok.Data;

import java.util.List;

@Data
public class AssignUsersToTaskRequest {
    private List<Long> userIds;
}