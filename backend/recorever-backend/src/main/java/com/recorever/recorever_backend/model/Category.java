package com.recorever.recorever_backend.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "categories")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "category_id")
    @JsonProperty("category_id")
    private int categoryId;

    @Column(name = "category_name")
    @JsonProperty("category_name")
    private String categoryName;

    @Column(name = "is_deleted")
    @JsonProperty("is_deleted")
    private boolean isDeleted;
}