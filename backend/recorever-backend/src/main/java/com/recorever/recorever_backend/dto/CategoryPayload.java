package com.recorever.recorever_backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CategoryPayload {
    @NotBlank(message = "Category name is required")
    private String category_name;
}