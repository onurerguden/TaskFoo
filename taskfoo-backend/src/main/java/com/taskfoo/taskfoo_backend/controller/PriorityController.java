package com.taskfoo.taskfoo_backend.controller;

import com.taskfoo.taskfoo_backend.model.Priority;
import com.taskfoo.taskfoo_backend.service.PriorityService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/priorities")
public class PriorityController {

    private final PriorityService priorityService;

    public PriorityController(PriorityService priorityService) {
        this.priorityService = priorityService;
    }

    @GetMapping
    public List<Priority> getAllPriorities() {
        return priorityService.getAllPriorities();
    }

    @PostMapping
    public Priority createPriority(@RequestBody Priority priority) {
        return priorityService.createPriority(priority);
    }

    @DeleteMapping("/{id}")
    public void deletePriority(@PathVariable Long id) {
        priorityService.deletePriority(id);
    }
}