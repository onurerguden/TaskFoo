// src/main/java/com/taskfoo/taskfoo_backend/service/UserService.java
package com.taskfoo.taskfoo_backend.service;

import com.taskfoo.taskfoo_backend.dto.response.common.UserBriefDto;
import com.taskfoo.taskfoo_backend.mapper.UserMapper;
import com.taskfoo.taskfoo_backend.model.Role;
import com.taskfoo.taskfoo_backend.model.User;
import com.taskfoo.taskfoo_backend.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;

@Service
public class UserService {
    private final UserRepository userRepository;
    public UserService(UserRepository userRepository) { this.userRepository = userRepository; }

    public List<UserBriefDto> getAllUsers() {
        return UserMapper.toBriefList(userRepository.findAll());
    }

    public UserBriefDto createUser(User user) {
        User saved = userRepository.save(user);
        return UserMapper.toBrief(saved);
    }

    public void deleteUser(Long id) {
        userRepository.deleteById(id);
    }


    public UserBriefDto updateUserRoles(Long userId, Set<Role> roles) {
        User u = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        u.setRoles(roles); // JPA ElementCollection 'user_roles' tablosunu update eder
        User saved = userRepository.save(u);
        return UserMapper.toBrief(saved);
    }
}