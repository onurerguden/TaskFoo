package com.taskfoo.taskfoo_backend.controller;

import com.taskfoo.taskfoo_backend.model.Epic;
import com.taskfoo.taskfoo_backend.service.EpicService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/epics")
public class EpicController {

    private final EpicService epicService;

    public EpicController(EpicService epicService) {
        this.epicService = epicService;
    }

    @GetMapping
    public List<Epic> getAllEpics() {
        return epicService.getAllEpics();
    }

    @PostMapping
    public Epic createEpic(@RequestBody Epic epic) {
        return epicService.createEpic(epic);
    }

    @DeleteMapping("/{id}")
    public void deleteEpic(@PathVariable Long id) {
        epicService.deleteEpic(id);
    }
}