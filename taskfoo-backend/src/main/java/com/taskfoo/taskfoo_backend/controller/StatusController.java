package com.taskfoo.taskfoo_backend.controller;

import com.taskfoo.taskfoo_backend.dto.response.common.IdNameDto;
import com.taskfoo.taskfoo_backend.model.Status;
import com.taskfoo.taskfoo_backend.service.StatusService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/statuses")
public class StatusController {

    private final StatusService statusService;

    public StatusController(StatusService statusService) {
        this.statusService = statusService;
    }

    @GetMapping
    public List<IdNameDto> getAll() {
        return statusService.getAll();
    }

    @PostMapping
    public IdNameDto create(@RequestBody Status status) {
        return statusService.create(status);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        statusService.delete(id);
    }
}