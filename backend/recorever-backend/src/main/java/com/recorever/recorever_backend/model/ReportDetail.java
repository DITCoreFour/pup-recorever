package com.recorever.recorever_backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "report_details")
@Data
public class ReportDetail {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "detail_id")
    private int detailId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "report_id", nullable = false)
    private Report report;

    @Column(name = "user_id")
    private Integer userId;

    @Column(name = "person_name")
    private String personName;

    @Column(name = "person_contact_email")
    private String personContactEmail;

    @Column(name = "person_contact_phone")
    private String personContactPhone;

    @Column(name = "admin_id")
    private Integer adminId;
}