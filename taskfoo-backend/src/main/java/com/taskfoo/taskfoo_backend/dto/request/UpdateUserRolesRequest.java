package com.taskfoo.taskfoo_backend.dto.request;

import com.taskfoo.taskfoo_backend.model.Role;
import jakarta.validation.constraints.NotNull;
import java.util.Set;

public class UpdateUserRolesRequest {
    @NotNull
    private Set<Role> roles;

    public Set<Role> getRoles() { return roles; }
    public void setRoles(Set<Role> roles) { this.roles = roles; }
}