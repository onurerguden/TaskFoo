package com.taskfoo.taskfoo_backend.service;

import com.taskfoo.taskfoo_backend.dto.request.auth.LoginRequest;
import com.taskfoo.taskfoo_backend.dto.request.auth.RegisterRequest;
import com.taskfoo.taskfoo_backend.dto.response.auth.AuthResponse;
import com.taskfoo.taskfoo_backend.dto.response.auth.MeResponse;
import com.taskfoo.taskfoo_backend.model.Role;
import com.taskfoo.taskfoo_backend.model.User;
import com.taskfoo.taskfoo_backend.repository.UserRepository;
import com.taskfoo.taskfoo_backend.security.JwtService;
import com.taskfoo.taskfoo_backend.security.UserPrincipal;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class AuthService {

    private final UserRepository userRepo;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final AuthenticationManager authManager;

    public AuthService(UserRepository userRepo, PasswordEncoder encoder, JwtService jwt, AuthenticationManager am) {
        this.userRepo = userRepo;
        this.encoder = encoder;
        this.jwt = jwt;
        this.authManager = am;
    }

    public AuthResponse register(RegisterRequest r) {
        userRepo.findByEmail(r.email()).ifPresent(u -> {
            throw new IllegalArgumentException("Email already in use");
        });

        User u = new User();
        u.setEmail(r.email());
        u.setName(r.name());
        u.setSurname(r.surname());
        u.setPassword(encoder.encode(r.password()));
        u.setRoles(new HashSet<>(Set.of(Role.DEV))); // default rol

        userRepo.save(u);

        String token = jwt.generate(u.getEmail(), Map.of("uid", u.getId()));
        return new AuthResponse(token);
    }

    public AuthResponse login(LoginRequest r) {
        Authentication auth = authManager.authenticate(
                new UsernamePasswordAuthenticationToken(r.email(), r.password())
        );
        UserPrincipal up = (UserPrincipal) auth.getPrincipal();
        String token = jwt.generate(up.getUsername(), Map.of("uid", up.getUser().getId()));
        return new AuthResponse(token);
    }

    public MeResponse me(Authentication auth) {
        UserPrincipal up = (UserPrincipal) auth.getPrincipal();
        var u = up.getUser();
        return new MeResponse(u.getId(), u.getEmail(), u.getName(), u.getSurname(), u.getRoles());
    }
}