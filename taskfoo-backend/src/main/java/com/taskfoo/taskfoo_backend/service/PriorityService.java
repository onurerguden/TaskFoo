package com.taskfoo.taskfoo_backend.service;

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

    public List<Priority> getAllPriorities() {
        return priorityRepository.findAll();
    }

    public Priority createPriority(Priority priority) {
        return priorityRepository.save(priority);
    }

    public void deletePriority(Long id) {
        priorityRepository.deleteById(id);
    }
}