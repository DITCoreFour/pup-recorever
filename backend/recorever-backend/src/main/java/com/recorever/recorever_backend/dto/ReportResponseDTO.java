package com.recorever.recorever_backend.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Output DTO for returning Report data.
 * Controls visibility of sensitive internal fields (like is_deleted) and access codes.
 */
@Data
public class ReportResponseDTO {
    private int report_id;
    private int user_id;
    private String type;
    private String category_name;
    private String item_name;
    private String location;
    private String surrendered_location_name;
    private String date_lost_found;
    private String date_reported;
    private String date_resolved;
    private String description;
    private String status_name;

    private String expiry_date;
    private String surrender_code;
    private String reporter_name;
    private String reporter_profile_picture;

    private LocalDateTime updatedAt;
    private boolean isAdminEdit;
    private List<ImageResponseDTO> images;
}