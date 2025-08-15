// src/main/java/com/taskfoo/taskfoo_backend/mapper/TaskMapper.java
package com.taskfoo.taskfoo_backend.mapper;

import com.taskfoo.taskfoo_backend.dto.request.task.*;
import com.taskfoo.taskfoo_backend.dto.response.common.*;
import com.taskfoo.taskfoo_backend.dto.response.task.*;
import com.taskfoo.taskfoo_backend.model.*;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class TaskMapper {

    public TaskListItemResponse toListItem(Task t) {
        return new TaskListItemResponse(
                t.getId(),
                t.getTitle(),
                t.getDescription(),
                t.getStartDate(),
                t.getDueDate(),
                t.getStatus()   == null ? null : new IdNameDto(t.getStatus().getId(),   t.getStatus().getName()),
                t.getPriority() == null ? null : new PriorityBriefDto(t.getPriority().getId(), t.getPriority().getName(), t.getPriority().getColor()),
                t.getEpic()     == null ? null : new IdNameDto(t.getEpic().getId(),     t.getEpic().getName()),
                mapAssignees(t),
                t.getVersion()
        );
    }

    public void applyCreate(Task t, CreateTaskRequest r,
                            Status status, Priority priority, Epic epic, List<User> assignees) {
        t.setTitle(r.title());
        t.setDescription(r.description());
        t.setStartDate(r.startDate());
        t.setDueDate(r.dueDate());
        t.setStatus(status);
        t.setPriority(priority);
        t.setEpic(epic);
        t.setAssignedUsers(assignees == null ? new ArrayList<>() : new ArrayList<>(assignees));
    }

    public void applyUpdate(Task t, UpdateTaskRequest r,
                            Status status, Priority priority, Epic epic, List<User> assignees) {
        if (r.title() != null)       t.setTitle(r.title());
        if (r.description() != null) t.setDescription(r.description());
        if (r.startDate() != null)   t.setStartDate(r.startDate());
        if (r.dueDate() != null)     t.setDueDate(r.dueDate());
        if (r.statusId() != null)    t.setStatus(status);
        if (r.priorityId() != null)  t.setPriority(priority);
        if (r.epicId() != null)      t.setEpic(epic);
        if (r.assigneeIds() != null) t.setAssignedUsers(new ArrayList<>(assignees));
    }

    // --- helpers ---

    private static String fullNameOf(User u) {
        String n = u.getName() == null ? "" : u.getName().trim();
        String s = u.getSurname() == null ? "" : u.getSurname().trim();
        return (n + " " + s).trim();
    }

    private static List<UserBriefDto> mapAssignees(Task t) {
        List<User> users = t.getAssignedUsers();
        if (users == null || users.isEmpty()) return Collections.emptyList();
        return users.stream()
                .map(u -> new UserBriefDto(u.getId(), fullNameOf(u), u.getRole()))
                .collect(Collectors.toList());
    }
}