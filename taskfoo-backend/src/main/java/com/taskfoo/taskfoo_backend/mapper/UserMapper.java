// src/main/java/com/taskfoo/taskfoo_backend/mapper/UserMapper.java
package com.taskfoo.taskfoo_backend.mapper;

import com.taskfoo.taskfoo_backend.dto.response.common.UserBriefDto;
import com.taskfoo.taskfoo_backend.model.User;

import java.util.List;

public class UserMapper {

    public static UserBriefDto toBrief(User u) {
        if (u == null) return null;
        String role = u.getRole();
        return new UserBriefDto(
                u.getId(),
                safe(u.getName()),
                safe(u.getSurname()),
                role
        );
    }

    public static List<UserBriefDto> toBriefList(List<User> list) {
        return list.stream().map(UserMapper::toBrief).toList();
    }

    private static String safe(String s) {
        return (s == null || s.isBlank()) ? "" : s.trim();
    }
}