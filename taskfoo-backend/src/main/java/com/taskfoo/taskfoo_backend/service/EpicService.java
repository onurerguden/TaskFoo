package com.taskfoo.taskfoo_backend.service;

import com.taskfoo.taskfoo_backend.model.Epic;
import com.taskfoo.taskfoo_backend.repository.EpicRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class EpicService {

    private final EpicRepository epicRepository;

    public EpicService(EpicRepository epicRepository) {
        this.epicRepository = epicRepository;
    }

    public List<Epic> getAllEpics() {
        return epicRepository.findAll();
    }

    public Optional<Epic> getEpicById(Long id) {
        return epicRepository.findById(id);
    }

    public Epic createEpic(Epic epic) {
        return epicRepository.save(epic);
    }

    public void deleteEpic(Long id) {
        epicRepository.deleteById(id);
    }
}