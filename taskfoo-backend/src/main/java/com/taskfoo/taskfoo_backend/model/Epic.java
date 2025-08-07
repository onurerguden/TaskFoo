package com.taskfoo.taskfoo_backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "epics")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Epic {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private String description;

    private LocalDate startDate;
    private LocalDate dueDate;
    private LocalDate createdAt;

    @ManyToOne
    @JoinColumn(name = "project_id")
    private Project project;
}