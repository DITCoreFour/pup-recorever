package com.recorever.recorever_backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AdminRegistrationDTO {
    @NotBlank(message = "Name is required")
    @Pattern(
      regexp = "^[a-zA-Z\\sñÑ\\-']+$",
      message = "Name contains invalid characters"
    )
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Email should be valid")
    private String email;

    @NotBlank(message = "Assigned location is required")
    private String assignedLocation;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;
}
