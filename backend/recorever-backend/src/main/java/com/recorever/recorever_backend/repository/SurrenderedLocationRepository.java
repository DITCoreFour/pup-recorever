package com.recorever.recorever_backend.repository;

import com.recorever.recorever_backend.model.SurrenderedLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SurrenderedLocationRepository extends JpaRepository<SurrenderedLocation, Integer> {
    List<SurrenderedLocation> findByIsDeletedFalse();
}