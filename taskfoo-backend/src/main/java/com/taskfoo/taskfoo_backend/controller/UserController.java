// src/main/java/com/taskfoo/taskfoo_backend/controller/UserController.java
package com.taskfoo.taskfoo_backend.controller;

import com.taskfoo.taskfoo_backend.dto.response.common.UserBriefDto;
import com.taskfoo.taskfoo_backend.model.User;
import com.taskfoo.taskfoo_backend.service.UserService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService userService;
    public UserController(UserService userService) { this.userService = userService; }

    @GetMapping
    public List<UserBriefDto> getAllUsers() {
        return userService.getAllUsers();
    }

    @PostMapping
    public UserBriefDto createUser(@RequestBody User user) {
        return userService.createUser(user);
    }

    @DeleteMapping("/{id}")
    public void deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
    }
}