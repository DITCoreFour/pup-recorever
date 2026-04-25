package com.recorever.recorever_backend.repository;

import com.recorever.recorever_backend.model.ReportStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface StatusRepository extends JpaRepository<ReportStatus, Integer> {
    List<ReportStatus> findByIsDeletedFalse();

    Optional<ReportStatus> findByStatusName(String statusName);
}