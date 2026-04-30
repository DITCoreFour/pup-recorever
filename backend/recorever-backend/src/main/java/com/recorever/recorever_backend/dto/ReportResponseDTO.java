package com.recorever.recorever_backend.dto;

import lombok.AllArgsConstructor;
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

    private String reporter_name;
    private String reporter_email;
    private String reporter_phone;
    private String type;
    private String category_name;
    private String item_name;
    private String location;
    private String surrendered_location_name;
    private String date_lost_found;
    private String date_reported;
    private String date_resolved;
    private String description;

    private StatusResponse status;

    private ReportDetailResponse reporter_details;

    @Data
    @AllArgsConstructor
    public static class ReportDetailResponse {
        private Integer reported_by_user_id;
        private String person_name;
        private String person_email;
        private String person_phone;
        private Integer admin_id;
    }

    @Data
    @AllArgsConstructor
    public static class StatusResponse {
        private int status_id;
        private String status_name;
    }

    private String expiry_date;
    private String surrender_code;
    private String reporter_profile_picture;

    private LocalDateTime updatedAt;
    private boolean isAdminEdit;
    private List<ImageResponseDTO> images;
}