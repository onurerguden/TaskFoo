package com.taskfoo.taskfoo_backend.controller;

import com.taskfoo.taskfoo_backend.model.Project;
import com.taskfoo.taskfoo_backend.service.ProjectService;
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
    public List<Project> getAllProjects() {
        return projectService.getAllProjects();
    }

    @PostMapping
    public Project createProject(@RequestBody Project project) {
        return projectService.createProject(project);
    }

    @DeleteMapping("/{id}")
    public void deleteProject(@PathVariable Long id) {
        projectService.deleteProject(id);
    }
}