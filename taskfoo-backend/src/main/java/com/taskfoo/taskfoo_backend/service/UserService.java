package com.taskfoo.taskfoo_backend.service;

import com.taskfoo.taskfoo_backend.dto.response.common.UserBriefDto;
import com.taskfoo.taskfoo_backend.mapper.UserMapper;
import com.taskfoo.taskfoo_backend.model.User;
import com.taskfoo.taskfoo_backend.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /** GET /api/users -> UserBriefDto list */
    public List<UserBriefDto> getAllUsersBrief() {
        return userRepository.findAll()
                .stream()
                .map(UserMapper::toBrief)
                .toList();
    }

    /** Opsiyonel: GET /api/users/{id} -> UserBriefDto */
    public UserBriefDto getUserBriefById(Long id) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("User not found"));
        return UserMapper.toBrief(u);
    }

    /** POST /api/users -> geri dönüş de DTO */
    public UserBriefDto createUser(User user) {
        User saved = userRepository.save(user);
        return UserMapper.toBrief(saved);
    }

    public void deleteUser(Long id) {
        userRepository.deleteById(id);
    }
}