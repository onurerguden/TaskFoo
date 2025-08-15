package com.taskfoo.taskfoo_backend.service;

import com.taskfoo.taskfoo_backend.dto.response.common.PriorityBriefDto;
import com.taskfoo.taskfoo_backend.model.Priority;
import com.taskfoo.taskfoo_backend.repository.PriorityRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PriorityService {

    private final PriorityRepository priorityRepository;

    public PriorityService(PriorityRepository priorityRepository) {
        this.priorityRepository = priorityRepository;
    }

    public List<PriorityBriefDto> getAll() {
        return priorityRepository.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    public PriorityBriefDto create(Priority priority) {
        Priority saved = priorityRepository.save(priority);
        return toDto(saved);
    }

    public void delete(Long id) {
        priorityRepository.deleteById(id);
    }

    private PriorityBriefDto toDto(Priority p) {
        return new PriorityBriefDto(p.getId(), p.getName(), p.getColor());
    }
}