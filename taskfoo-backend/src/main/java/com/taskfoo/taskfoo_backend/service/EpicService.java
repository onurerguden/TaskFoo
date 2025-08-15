// src/main/java/com/taskfoo/taskfoo_backend/service/EpicService.java
package com.taskfoo.taskfoo_backend.service;

import com.taskfoo.taskfoo_backend.dto.request.epic.CreateEpicRequest;
import com.taskfoo.taskfoo_backend.dto.request.epic.UpdateEpicRequest;
import com.taskfoo.taskfoo_backend.dto.response.epic.EpicDto;
import com.taskfoo.taskfoo_backend.mapper.EpicMapper;
import com.taskfoo.taskfoo_backend.model.Epic;
import com.taskfoo.taskfoo_backend.model.Project;
import com.taskfoo.taskfoo_backend.repository.EpicRepository;
import com.taskfoo.taskfoo_backend.repository.ProjectRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class EpicService {

    private final EpicRepository epicRepository;
    private final ProjectRepository projectRepository;

    public EpicService(EpicRepository epicRepository, ProjectRepository projectRepository) {
        this.epicRepository = epicRepository;
        this.projectRepository = projectRepository;
    }

    @Transactional(readOnly = true)
    public List<EpicDto> list() {
        return epicRepository.findAll()
                .stream().map(EpicMapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public EpicDto get(Long id) {
        Epic e = epicRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Epic not found: " + id));
        return EpicMapper.toDto(e);
    }

    public EpicDto create(CreateEpicRequest req) {
        Project project = (req.projectId() == null) ? null :
                projectRepository.findById(req.projectId())
                        .orElseThrow(() -> new EntityNotFoundException("Project not found: " + req.projectId()));

        Epic entity = EpicMapper.fromCreate(req, project);
        Epic saved = epicRepository.save(entity);
        return EpicMapper.toDto(saved);
    }

    public EpicDto update(Long id, UpdateEpicRequest req) {
        Epic e = epicRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Epic not found: " + id));

        Project project = (req.projectId() == null) ? null :
                projectRepository.findById(req.projectId())
                        .orElseThrow(() -> new EntityNotFoundException("Project not found: " + req.projectId()));

        EpicMapper.applyUpdate(e, req, project);
        return EpicMapper.toDto(e); // dirty checking ile persist olunur
    }

    public void delete(Long id) {
        if (!epicRepository.existsById(id)) {
            throw new EntityNotFoundException("Epic not found: " + id);
        }
        epicRepository.deleteById(id);
    }
}