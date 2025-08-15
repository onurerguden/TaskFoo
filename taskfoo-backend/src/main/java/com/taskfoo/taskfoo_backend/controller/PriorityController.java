package com.taskfoo.taskfoo_backend.controller;

import com.taskfoo.taskfoo_backend.dto.response.common.PriorityBriefDto;
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
    public List<PriorityBriefDto> getAll() {
        return priorityService.getAll();
    }

    @PostMapping
    public PriorityBriefDto create(@RequestBody Priority priority) {
        return priorityService.create(priority);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        priorityService.delete(id);
    }
}