package com.recorever.recorever_backend.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "surrendered_locations")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SurrenderedLocation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "surrendered_location_id")
    @JsonProperty("surrendered_location_id")
    private int surrenderedLocationId;

    @Column(name = "admin_id")
    @JsonProperty("admin_id")
    private int adminId;

    @Column(name = "surrendered_location_name")
    @JsonProperty("surrendered_location_name")
    private String surrenderedLocationName;

    @Column(name = "is_deleted")
    @JsonProperty("is_deleted")
    private boolean isDeleted;
}