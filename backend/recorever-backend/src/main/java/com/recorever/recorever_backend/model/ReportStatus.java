package com.recorever.recorever_backend.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "statuses")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReportStatus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "status_id")
    @JsonProperty("status_id")
    private int statusId;

    @Column(name = "status_name")
    @JsonProperty("status_name")
    private String statusName;

    @Column(name = "is_deleted")
    @JsonProperty("is_deleted")
    private boolean isDeleted;

    // Constants helper
    public static final String PENDING = "pending";
    public static final String REJECTED = "rejected";
    public static final String APPROVED = "approved";
    public static final String MATCHED = "matched";
    public static final String CLAIMED = "claimed";
    public static final String RESOLVED = "resolved";
}