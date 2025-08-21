package com.taskfoo.taskfoo_backend.controller;

import com.taskfoo.taskfoo_backend.dto.request.auth.LoginRequest;
import com.taskfoo.taskfoo_backend.dto.request.auth.RegisterRequest;
import com.taskfoo.taskfoo_backend.dto.response.auth.AuthResponse;
import com.taskfoo.taskfoo_backend.dto.response.auth.MeResponse;
import com.taskfoo.taskfoo_backend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService service;

    public AuthController(AuthService service) { this.service = service; }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req) {
        return ResponseEntity.ok(service.register(req));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(service.login(req));
    }

    @GetMapping("/me")
    public ResponseEntity<MeResponse> me(Authentication auth) {
        return ResponseEntity.ok(service.me(auth));
    }
}