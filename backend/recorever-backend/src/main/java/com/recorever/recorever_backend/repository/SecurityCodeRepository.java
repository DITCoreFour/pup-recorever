package com.recorever.recorever_backend.repository;

import com.recorever.recorever_backend.model.SecurityCode;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface SecurityCodeRepository extends JpaRepository<SecurityCode, Integer> {
    void deleteByUserId(Integer userId);
    
    Optional<SecurityCode> findByVerificationToken(String token);
}