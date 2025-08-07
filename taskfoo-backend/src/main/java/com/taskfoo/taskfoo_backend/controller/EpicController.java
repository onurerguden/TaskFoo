package com.taskfoo.taskfoo_backend.controller;

import com.taskfoo.taskfoo_backend.model.Epic;
import com.taskfoo.taskfoo_backend.repository.EpicRepository;
import com.taskfoo.taskfoo_backend.repository.ProjectRepository;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/epics")
public class EpicController {

    private final EpicRepository epicRepository;
    private final ProjectRepository projectRepository;

    public EpicController(EpicRepository epicRepository, ProjectRepository projectRepository) {
        this.epicRepository = epicRepository;
        this.projectRepository = projectRepository;
    }

    @GetMapping
    public List<Epic> getAllEpics() {
        return epicRepository.findAll();
    }

    @PostMapping
    public Epic createEpic(@RequestBody Epic epic) {
        epic.setCreatedAt(LocalDate.now());
        return epicRepository.save(epic);
    }

    @DeleteMapping("/{id}")
    public void deleteEpic(@PathVariable Long id) {
        epicRepository.deleteById(id);
    }


}