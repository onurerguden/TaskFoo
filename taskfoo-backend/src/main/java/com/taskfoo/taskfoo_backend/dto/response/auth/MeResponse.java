package com.taskfoo.taskfoo_backend.dto.response.auth;

import com.taskfoo.taskfoo_backend.model.Role;
import java.util.Set;

public record MeResponse(Long id, String email, String name, String surname, Set<Role> roles) {}