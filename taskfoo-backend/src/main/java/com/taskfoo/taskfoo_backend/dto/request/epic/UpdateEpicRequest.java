// src/main/java/com/taskfoo/taskfoo_backend/dto/request/epic/UpdateEpicRequest.java
package com.taskfoo.taskfoo_backend.dto.request.epic;

import java.time.LocalDate;

public record UpdateEpicRequest(
        String name,
        String description,
        Long projectId,          // null gelirse dokunma; boş değerle kaldırma ihtiyacı varsa ayrı bir bayrak tasarlayın
        LocalDate startDate,
        LocalDate dueDate
) {}