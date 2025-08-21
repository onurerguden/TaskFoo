package com.taskfoo.taskfoo_backend.security;

import com.taskfoo.taskfoo_backend.model.User;
import com.taskfoo.taskfoo_backend.repository.UserRepository;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {
    private final UserRepository repo;

    public CustomUserDetailsService(UserRepository repo) { this.repo = repo; }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User u = repo.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
        return new UserPrincipal(u);
    }
}