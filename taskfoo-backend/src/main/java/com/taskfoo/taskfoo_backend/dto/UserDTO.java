package com.taskfoo.taskfoo_backend.dto;

import lombok.Data;

@Data
public class UserDTO {
    private Long id;
    private String name;
    private String surname;
    private String role;
}