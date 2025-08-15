package com.taskfoo.taskfoo_backend.mapper;


import com.taskfoo.taskfoo_backend.dto.response.Project.ProjectDto;
import com.taskfoo.taskfoo_backend.model.Project;

public final class ProjectMapper {
    private ProjectMapper() {}

    public static ProjectDto toDto(Project p) {
        if (p == null) return null;
        return new ProjectDto(
                p.getId(),
                p.getName(),
                p.getDescription(),
                p.getStartDate(),
                p.getDueDate(),
                p.getCreatedAt()
        );
    }
}