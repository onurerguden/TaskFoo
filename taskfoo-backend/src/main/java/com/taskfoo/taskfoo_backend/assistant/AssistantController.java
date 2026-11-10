package com.taskfoo.taskfoo_backend.assistant;

import com.taskfoo.taskfoo_backend.security.UserPrincipal;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/assistant")
class AssistantController {
    private final AssistantService assistant;

    AssistantController(AssistantService assistant) {
        this.assistant = assistant;
    }

    record ChatRequest(@Positive long projectId, @NotBlank @Size(max = 2000) String message) {}

    @PostMapping("/chat")
    AssistantService.Chat chat(@AuthenticationPrincipal UserPrincipal principal, @Valid @RequestBody ChatRequest body) {
        return assistant.chat(principal.getUser().getId(), body.projectId(), body.message());
    }

    @PostMapping("/proposals/{id}/confirm")
    AssistantService.Receipt confirm(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        return assistant.confirm(principal.getUser().getId(), id);
    }
}
