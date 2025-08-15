package com.taskfoo.taskfoo_backend.service;

import com.taskfoo.taskfoo_backend.dto.response.common.IdNameDto;
import com.taskfoo.taskfoo_backend.model.Status;
import com.taskfoo.taskfoo_backend.repository.StatusRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class StatusService {

    private final StatusRepository statusRepository;

    public StatusService(StatusRepository statusRepository) {
        this.statusRepository = statusRepository;
    }

    public List<IdNameDto> getAll() {
        return statusRepository.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    public IdNameDto create(Status status) {
        Status saved = statusRepository.save(status);
        return toDto(saved);
    }

    public void delete(Long id) {
        statusRepository.deleteById(id);
    }

    private IdNameDto toDto(Status s) {
        return new IdNameDto(s.getId(), s.getName());
    }
}