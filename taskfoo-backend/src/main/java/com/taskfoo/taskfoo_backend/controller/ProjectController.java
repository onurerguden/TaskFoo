// src/main/java/com/taskfoo/taskfoo_backend/controller/ProjectController.java
package com.taskfoo.taskfoo_backend.controller;

import com.taskfoo.taskfoo_backend.dto.request.project.CreateProjectRequest;
import com.taskfoo.taskfoo_backend.dto.request.project.UpdateProjectRequest;
import com.taskfoo.taskfoo_backend.dto.response.Project.ProjectDto;
import com.taskfoo.taskfoo_backend.service.ProjectService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping
    public List<ProjectDto> list() {
        return projectService.list();
    }

    @GetMapping("/{id}")
    public ProjectDto get(@PathVariable Long id) {
        return projectService.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectDto create(@Valid @RequestBody CreateProjectRequest req) {
        return projectService.create(req);
    }

    @PutMapping("/{id}")
    public ProjectDto update(@PathVariable Long id, @Valid @RequestBody UpdateProjectRequest req) {
        return projectService.update(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        projectService.delete(id);
    }
}