package com.recorever.recorever_backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "security_codes")
@Data
public class SecurityCode {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "code_id")
    private Integer codeId;

    @Column(name = "user_id")
    private Integer userId;

    @Column(name = "verification_token")
    private String verificationToken;

    @Column(name = "type")
    private String type; // e.g., "EMAIL_VERIFICATION"

    @Column(name = "is_verified")
    private boolean isVerified;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;
}