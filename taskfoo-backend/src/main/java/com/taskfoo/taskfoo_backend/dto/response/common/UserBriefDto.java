// src/main/java/com/taskfoo/taskfoo_backend/dto/response/common/UserBriefDto.java
package com.taskfoo.taskfoo_backend.dto.response.common;

public record UserBriefDto(Long id, String name, String surname, String role) {}