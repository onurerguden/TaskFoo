// src/main/java/com/taskfoo/taskfoo_backend/mapper/ProjectMapper.java
package com.taskfoo.taskfoo_backend.mapper;

import com.taskfoo.taskfoo_backend.dto.request.project.CreateProjectRequest;
import com.taskfoo.taskfoo_backend.dto.request.project.UpdateProjectRequest;
import com.taskfoo.taskfoo_backend.dto.response.Project.ProjectDto;
import com.taskfoo.taskfoo_backend.model.Project;

public class ProjectMapper {

    public static ProjectDto toDto(Project p) {
        return new ProjectDto(
                p.getId(),
                p.getName(),
                p.getDescription(),
                p.getStartDate(),
                p.getDueDate(),
                p.getCreatedAt()
        );
    }

    public static Project fromCreate(CreateProjectRequest r) {
        Project p = new Project();
        p.setName(r.name());
        p.setDescription(r.description());
        p.setStartDate(r.startDate());
        p.setDueDate(r.dueDate());
        return p;
    }

    /** Update in-place (null alanları atla) */
    public static void applyUpdate(Project p, UpdateProjectRequest r) {
        if (r.name() != null)        p.setName(r.name());
        if (r.description() != null) p.setDescription(r.description());
        if (r.startDate() != null)   p.setStartDate(r.startDate());
        if (r.dueDate() != null)     p.setDueDate(r.dueDate());
    }
}