package com.recorever.recorever_backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

@Data
public class ReportCreationDTO {

    @NotBlank(message = "Report type is required")
    @Pattern(regexp = "lost|found", message = "Type must be 'lost' or 'found'")
    private String type;

    @NotNull(message = "Category is required")
    @Min(value = 1, message = "Invalid category ID")
    private Integer category_id;

    @NotBlank(message = "Item name is required")
    private String item_name;

    @NotBlank(message = "Location is required")
    private String location;

    private Integer surrendered_location_id;

    @NotBlank(message = "Date is required")
    private String date_lost_found;

    @NotBlank(message = "Description is required")
    @Size(min = 10, max = 500, message = "Description must be between 10 and 500 characters")
    private String description;

    private List<MultipartFile> files;
}