package com.taskfoo.taskfoo_backend.model;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum Role { ADMIN, PM, DEV, SPEC, ANAL;


    @JsonCreator
    public static Role fromJson(String v) {
        if (v == null) return null;
        return Role.valueOf(v.trim().toUpperCase());
    }
}