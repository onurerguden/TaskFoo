package com.taskfoo.taskfoo_backend.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        final String bearerSchemeName = "BearerAuth";
        return new OpenAPI()
                .info(new Info()
                        .title("TaskFoo API")
                        .description("TaskFoo authentication & project management API")
                        .version("v1.0.0"))
                .components(new Components()
                        .addSecuritySchemes(bearerSchemeName,
                                new SecurityScheme()
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList(bearerSchemeName));
    }
}