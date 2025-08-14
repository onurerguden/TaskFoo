package com.taskfoo.taskfoo_backend.model;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TaskEvent {
    private String type;   // "TASK_CREATED", "TASK_UPDATED"...
    private Object payload; // Task veya Long
}