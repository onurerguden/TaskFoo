// src/main/java/com/taskfoo/taskfoo_backend/controller/AuthController.java
package com.taskfoo.taskfoo_backend.controller;

import com.taskfoo.taskfoo_backend.dto.request.auth.LoginRequest;
import com.taskfoo.taskfoo_backend.dto.request.auth.RegisterRequest;
import com.taskfoo.taskfoo_backend.dto.response.auth.AuthResponse;
import com.taskfoo.taskfoo_backend.dto.response.auth.MeResponse;
import com.taskfoo.taskfoo_backend.security.AuthAudit;
import com.taskfoo.taskfoo_backend.security.UserPrincipal;
import com.taskfoo.taskfoo_backend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService service;
    private final AuthenticationManager authenticationManager;
    private final AuthAudit authAudit;

    public AuthController(AuthService service,
                          AuthenticationManager authenticationManager,
                          AuthAudit authAudit) {
        this.service = service;
        this.authenticationManager = authenticationManager;
        this.authAudit = authAudit;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req) {
        return ResponseEntity.ok(service.register(req));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        try {
            Authentication auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(req.email(), req.password())
            );
            SecurityContextHolder.getContext().setAuthentication(auth);

            // audit (KESİN)
            UserPrincipal up = (UserPrincipal) auth.getPrincipal();
            authAudit.loginSuccess(up.getUser().getId(), up.getUsername());

            AuthResponse tokens = service.issueTokenFor(auth);
            return ResponseEntity.ok(tokens);
        } catch (BadCredentialsException ex) {
            // audit (KESİN)
            authAudit.loginFailure(req.email(), ex.getClass().getSimpleName());
            throw ex;
        }
    }

    @GetMapping("/me")
    public ResponseEntity<MeResponse> me(Authentication auth) {
        return ResponseEntity.ok(service.me(auth));
    }
}