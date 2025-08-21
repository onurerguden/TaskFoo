package com.taskfoo.taskfoo_backend.config;

import com.taskfoo.taskfoo_backend.security.CustomUserDetailsService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.authentication.*;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class AuthManagerConfig {

    @Bean
    public AuthenticationManager authenticationManager(
            CustomUserDetailsService uds,
            PasswordEncoder encoder
    ) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(uds);
        provider.setPasswordEncoder(encoder);
        return new ProviderManager(provider);
    }
}