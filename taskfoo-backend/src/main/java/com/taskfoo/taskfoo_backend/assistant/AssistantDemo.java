package com.taskfoo.taskfoo_backend.assistant;

import com.taskfoo.taskfoo_backend.model.*;
import com.taskfoo.taskfoo_backend.repository.*;
import java.time.LocalDate;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration(proxyBeanMethods = false)
@Profile("assistant-demo")
class AssistantDemo {
    @Bean
    ApplicationRunner assistantFixtures(UserRepository users, PasswordEncoder passwords, ProjectRepository projects,
            EpicRepository epics, TaskRepository tasks, StatusRepository statuses, PriorityRepository priorities,
            @Value("${taskfoo.demo.password}") String password) {
        return args -> {
            if (password.isBlank()) throw new IllegalArgumentException("Set TASKFOO_DEMO_PASSWORD.");
            String email = "pm@example.test";
            if (users.findByEmail(email).isPresent()) return;
            var all = statuses.findAll();
            var todo = all.stream().filter(status -> "Todo".equals(status.getName())).findFirst()
                .orElseGet(() -> statuses.save(new Status(null, "Todo")));
            if (all.stream().noneMatch(status -> "Done".equals(status.getName()))) statuses.save(new Status(null, "Done"));
            var high = priorities.findAll().stream().filter(priority -> "High".equals(priority.getName())).findFirst()
                .orElseGet(() -> priorities.save(new Priority(null, "High", "red")));
            for (String name : new String[]{"Delivery Lab", "Other Project"}) {
                Project project = new Project();
                project.setName(name);
                project = projects.save(project);
                Epic epic = new Epic();
                epic.setName("Delivery");
                epic.setProject(project);
                epic = epics.save(epic);
                Task task = new Task();
                task.setTitle("Report");
                task.setDescription("Prepare the project report");
                task.setEpic(epic);
                task.setStatus(todo);
                task.setPriority(high);
                task.setStartDate(LocalDate.parse("2026-11-10"));
                task.setDueDate(LocalDate.parse("2026-11-12"));
                tasks.save(task);
            }
            User pm = new User();
            pm.setEmail(email);
            pm.setName("Demo");
            pm.setSurname("Manager");
            pm.setRoles(Set.of(Role.PM));
            pm.setPassword(passwords.encode(password));
            users.save(pm);
        };
    }
}
