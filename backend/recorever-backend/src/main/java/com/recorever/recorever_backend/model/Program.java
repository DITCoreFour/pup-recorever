package com.recorever.recorever_backend.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "programs")
@Data
public class Program {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "program_id")
  private int programId;

  @Column(name = "program_code", nullable = false)
  private String programCode;

  @Column(name = "program_name", nullable = false)
  private String programName;

  @Column(name = "is_deleted")
  private boolean isDeleted;
}