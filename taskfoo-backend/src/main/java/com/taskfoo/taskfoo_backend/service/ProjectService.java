// src/main/java/com/taskfoo/taskfoo_backend/service/ProjectService.java
package com.taskfoo.taskfoo_backend.service;

import com.taskfoo.taskfoo_backend.dto.request.project.CreateProjectRequest;
import com.taskfoo.taskfoo_backend.dto.request.project.UpdateProjectRequest;
import com.taskfoo.taskfoo_backend.dto.response.Project.ProjectDto;
import com.taskfoo.taskfoo_backend.mapper.ProjectMapper;
import com.taskfoo.taskfoo_backend.model.Project;
import com.taskfoo.taskfoo_backend.repository.ProjectRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
@Service
@Transactional
public class ProjectService {

    private final ProjectRepository projectRepository;

    public ProjectService(ProjectRepository projectRepository) {
        this.projectRepository = projectRepository;
    }

    @Transactional(readOnly = true)
    public List<ProjectDto> list() {
        return projectRepository.findAll().stream()
                .map(ProjectMapper::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProjectDto get(Long id) {
        Project p = projectRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Project not found: " + id));
        return ProjectMapper.toDto(p);
    }

    public ProjectDto create(CreateProjectRequest req) {
        Project saved = projectRepository.save(ProjectMapper.fromCreate(req));
        return ProjectMapper.toDto(saved);
    }

    public ProjectDto update(Long id, UpdateProjectRequest req) {
        Project p = projectRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Project not found: " + id));
        ProjectMapper.applyUpdate(p, req);
        return ProjectMapper.toDto(p); // dirty-checking ile persist
    }

    public void delete(Long id) {
        if (!projectRepository.existsById(id)) {
            throw new EntityNotFoundException("Project not found: " + id);
        }
        projectRepository.deleteById(id);
    }
}