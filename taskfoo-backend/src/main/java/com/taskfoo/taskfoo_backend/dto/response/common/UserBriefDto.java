// src/main/java/com/taskfoo/taskfoo_backend/dto/response/common/UserBriefDto.java
package com.taskfoo.taskfoo_backend.dto.response.common;

import com.taskfoo.taskfoo_backend.model.Role;

import java.util.Set;

public record UserBriefDto(
        Long id,
        String name,
        String surname,
        String email,
        Set<Role> roles
) {}