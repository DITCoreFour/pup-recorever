package com.recorever.recorever_backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data 
public class UserRegistrationDTO {

  @NotBlank(message = "First name is required")
  @Pattern(
    regexp = "^[a-zA-Z\\sñÑ\\-']+$", 
    message = "First name contains invalid characters"
  )
  private String firstName;

  @NotBlank(message = "Last name is required")
  @Pattern(
    regexp = "^[a-zA-Z\\sñÑ\\-']+$", 
    message = "Last name contains invalid characters"
  )
  private String lastName;

  @NotBlank(message = "Email is required")
  @Email(message = "Email should be valid")
  private String email;

  @NotBlank(message = "Password is required")
  @Size(min = 8, message = "Password must be at least 8 characters")
  private String password;
  
  private Integer programId;
  private Integer year;
}