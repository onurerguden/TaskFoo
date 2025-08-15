package com.taskfoo.taskfoo_backend.mapper;// package com.taskfoo.taskfoo_backend.dto.mapper;

import com.taskfoo.taskfoo_backend.dto.response.common.PriorityBriefDto;
import com.taskfoo.taskfoo_backend.model.Priority;

import java.util.List;

public class PriorityMapper {
    public static PriorityBriefDto toDto(Priority p) {
        if (p == null) return null;
        return new PriorityBriefDto(p.getId(), p.getName(), p.getColor());
    }

    public static List<PriorityBriefDto> toDtoList(List<Priority> list) {
        return list.stream().map(PriorityMapper::toDto).toList();
    }
}