package com.taskfoo.taskfoo_backend.dto.request.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @Email @NotBlank String email,
        @NotBlank @Size(min=2,max=60) String name,
        @NotBlank @Size(min=2,max=60) String surname,
        @NotBlank @Size(min=6,max=100) String password
) {}