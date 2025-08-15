// src/main/java/com/taskfoo/taskfoo_backend/mapper/EpicMapper.java
package com.taskfoo.taskfoo_backend.mapper;

import com.taskfoo.taskfoo_backend.dto.request.epic.CreateEpicRequest;
import com.taskfoo.taskfoo_backend.dto.request.epic.UpdateEpicRequest;
import com.taskfoo.taskfoo_backend.dto.response.common.IdNameDto;
import com.taskfoo.taskfoo_backend.dto.response.epic.EpicDto;
import com.taskfoo.taskfoo_backend.model.Epic;
import com.taskfoo.taskfoo_backend.model.Project;

public class EpicMapper {

    public static EpicDto toDto(Epic e) {
        return new EpicDto(
                e.getId(),
                e.getName(),
                e.getDescription(),
                e.getStartDate(),
                e.getDueDate(),
                e.getCreatedAt(),
                e.getProject() == null ? null : new IdNameDto(e.getProject().getId(), e.getProject().getName())
        );
    }

    /** Create -> Entity */
    public static Epic fromCreate(CreateEpicRequest r, Project projectOrNull) {
        Epic e = new Epic();
        e.setName(r.name());
        e.setDescription(r.description());
        e.setStartDate(r.startDate());
        e.setDueDate(r.dueDate());
        e.setProject(projectOrNull);
        return e;
    }

    /** Update in-place */
    public static void applyUpdate(Epic e, UpdateEpicRequest r, Project projectOrNull) {
        if (r.name() != null) e.setName(r.name());
        if (r.description() != null) e.setDescription(r.description());
        if (r.startDate() != null) e.setStartDate(r.startDate());
        if (r.dueDate() != null) e.setDueDate(r.dueDate());
        if (r.projectId() != null) e.setProject(projectOrNull);
    }
}