package com.taskfoo.taskfoo_backend.config;

import com.taskfoo.taskfoo_backend.security.JwtAuthFilter;
import com.taskfoo.taskfoo_backend.security.AuditLogoutSuccessHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.Nullable;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtFilter;
    private final @Nullable AuditLogoutSuccessHandler auditLogoutSuccessHandler;

    public SecurityConfig(JwtAuthFilter jwtFilter,
                          @Nullable AuditLogoutSuccessHandler auditLogoutSuccessHandler) {
        this.jwtFilter = jwtFilter;
        this.auditLogoutSuccessHandler = auditLogoutSuccessHandler;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(c -> c.configurationSource(corsConfig()))
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/auth/**",
                                "/ws/**",
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html"
                        ).permitAll()
                        .anyRequest().authenticated()
                )
                .httpBasic(b -> b.disable())
                .formLogin(f -> f.disable())
                .logout(logout -> {
                    // JWT'de server-side state yok ama bir logout endpoint'i audit için faydalı
                    logout.logoutUrl("/auth/logout");
                    if (auditLogoutSuccessHandler != null) {
                        logout.logoutSuccessHandler(auditLogoutSuccessHandler);
                    }
                })
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /** CORS: custom header'ları da allow + expose */
    private CorsConfigurationSource corsConfig() {
        CorsConfiguration c = new CorsConfiguration();

        // Origin: property + localhost fallback
        String propOrigin = System.getProperty("app.cors.allowed-origin", "http://localhost:5173");
        c.setAllowedOrigins(List.of(propOrigin));

        // Methods
        c.setAllowedMethods(Arrays.asList("GET","POST","PUT","PATCH","DELETE","OPTIONS"));

        // Headers (client → server)
        c.setAllowedHeaders(Arrays.asList(
                "Authorization",
                "Content-Type",
                "X-Client-Change-Id",
                "X-Page-Context",
                "X-Request-Id",
                "X-Forwarded-For",
                "User-Agent"
        ));

        // Expose (server → client) — RequestContextFilter X-Request-Id'ı response'a koyuyor
        c.setExposedHeaders(List.of("X-Request-Id"));

        c.setAllowCredentials(true);
        c.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", c);
        return source;
    }
}