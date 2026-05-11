package com.recorever.recorever_backend.dto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminResponseDTO {
    private Integer id;
    private String name;
    private String email;
    private String location;
    private String role;
    private String status;
}
