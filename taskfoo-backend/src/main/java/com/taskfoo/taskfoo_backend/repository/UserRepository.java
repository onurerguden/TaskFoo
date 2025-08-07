package com.taskfoo.taskfoo_backend.repository;
import com.taskfoo.taskfoo_backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository  extends JpaRepository<User, Long> {
}
