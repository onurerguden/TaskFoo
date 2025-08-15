package com.taskfoo.taskfoo_backend.mapper;

import com.taskfoo.taskfoo_backend.dto.response.common.UserBriefDto;
import com.taskfoo.taskfoo_backend.model.User;

import java.util.List;

public class UserMapper {

    public static UserBriefDto toBrief(User u) {
        if (u == null) return null;
        String fullName = (u.getName() == null ? "" : u.getName().trim())
                + (u.getSurname() == null || u.getSurname().isBlank() ? "" : " " + u.getSurname().trim());

        String role = u.getRole();
        return new UserBriefDto(u.getId(), fullName.trim(), role);
    }

    public static List<UserBriefDto> toBriefList(List<User> list) {
        return list.stream()
                .map(UserMapper::toBrief)
                .toList();
    }
}