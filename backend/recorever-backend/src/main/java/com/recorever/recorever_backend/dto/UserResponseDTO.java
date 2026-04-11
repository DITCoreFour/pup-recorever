package com.recorever.recorever_backend.dto;

import lombok.Data;

/**
 * Output DTO for sending user data to the client.
 * Only includes non-sensitive, public fields.
 * (Excludes password_hash, refresh_token, etc.)
 */
@Data
public class UserResponseDTO {
    private int user_id;
    private String first_name;
    private String last_name;
    private String email;
    private String role;
    private String profile_picture;
    private Integer program_id;
    private Integer year_level;
    private String created_at;
}