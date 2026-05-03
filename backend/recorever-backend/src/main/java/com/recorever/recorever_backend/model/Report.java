package com.recorever.recorever_backend.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;
import java.time.LocalDateTime;
import java.util.ArrayList;

@Entity
@Table(name = "reports")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "report_id")
    @JsonProperty("report_id")
    private int reportId;

    @OneToOne(mappedBy = "report", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @JsonProperty("details")
    private ReportDetail details;

    @Column(name = "user_id")
    @JsonProperty("user_id")
    private Integer userId;

    private String type;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    @JsonProperty("category")
    private Category category;

    @Column(name = "item_name")
    @JsonProperty("item_name")
    private String itemName;

    private String location;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "surrendered_location_id")
    @JsonProperty("surrendered_location")
    private SurrenderedLocation surrenderedLocation;

    @Column(name = "date_lost_found")
    @JsonProperty("date_lost_found")
    private String dateLostFound;

    @Column(name = "date_reported")
    @JsonProperty("date_reported")
    private String dateReported;

    @Column(name = "date_resolved")
    @JsonProperty("date_resolved")
    private String dateResolved;

    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "status_id")
    @JsonProperty("status_id")
    private ReportStatus status;

    @Column(name = "surrender_code")
    @JsonProperty("surrender_code")
    private String surrenderCode;

    @Column(name = "updated_at")
    @JsonProperty("updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "last_updated_by")
    @JsonProperty("last_updated_by")
    private Integer lastUpdatedById;

    @Column(name = "is_admin_edit")
    @JsonProperty("is_admin_edit")
    private boolean isAdminEdit;

    @Column(name = "is_deleted")
    @JsonProperty("is_deleted")
    private boolean isDeleted;

    @Transient
    @JsonProperty("reporter_name")
    private String reporterName;

    @Transient
    @JsonProperty("expiry_date")
    private String expiryDate;

    @Transient
    @JsonProperty("reporter_profile_picture")
    private String reporterProfilePicture;

    @OneToMany(mappedBy = "reportId", fetch = FetchType.LAZY)
    private List<Image> images = new ArrayList<>();
}