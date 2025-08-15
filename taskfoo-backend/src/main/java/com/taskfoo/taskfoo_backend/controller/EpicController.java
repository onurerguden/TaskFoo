// src/main/java/com/taskfoo/taskfoo_backend/controller/EpicController.java
package com.taskfoo.taskfoo_backend.controller;

import com.taskfoo.taskfoo_backend.dto.request.epic.CreateEpicRequest;
import com.taskfoo.taskfoo_backend.dto.request.epic.UpdateEpicRequest;
import com.taskfoo.taskfoo_backend.dto.response.epic.EpicDto;
import com.taskfoo.taskfoo_backend.service.EpicService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
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
    public List<EpicDto> list() {
        return epicService.list();
    }

    @GetMapping("/{id}")
    public EpicDto get(@PathVariable Long id) {
        return epicService.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EpicDto create(@Valid @RequestBody CreateEpicRequest req) {
        return epicService.create(req);
    }

    @PutMapping("/{id}")
    public EpicDto update(@PathVariable Long id, @Valid @RequestBody UpdateEpicRequest req) {
        return epicService.update(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        epicService.delete(id);
    }
}