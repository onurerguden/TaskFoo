// src/main/java/com/taskfoo/taskfoo_backend/dto/request/project/UpdateProjectRequest.java
package com.taskfoo.taskfoo_backend.dto.request.project;

import java.time.LocalDate;

/** Null gelen alanlar "dokunma" olarak yorumlanır */
public record UpdateProjectRequest(
        String name,
        String description,
        LocalDate startDate,
        LocalDate dueDate
) {}