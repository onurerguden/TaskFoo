package com.taskfoo.taskfoo_backend.mapper;// package com.taskfoo.taskfoo_backend.mapper;

import com.taskfoo.taskfoo_backend.dto.response.common.IdNameDto;
import com.taskfoo.taskfoo_backend.model.Status;

import java.util.List;

public class StatusMapper {
    public static IdNameDto toDto(Status s) {
        if (s == null) return null;
        return new IdNameDto(s.getId(), s.getName());
    }

    public static List<IdNameDto> toDtoList(List<Status> list) {
        return list.stream().map(StatusMapper::toDto).toList();
    }
}