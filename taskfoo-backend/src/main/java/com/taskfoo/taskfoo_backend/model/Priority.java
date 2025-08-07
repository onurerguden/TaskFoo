package com.taskfoo.taskfoo_backend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "priorities")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Priority {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String name; // e.g. "Low", "Medium", "High"

    private String color; // e.g. "green", "orange", "red"
}