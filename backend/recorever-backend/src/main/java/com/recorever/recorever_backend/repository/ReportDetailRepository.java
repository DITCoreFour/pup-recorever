package com.recorever.recorever_backend.repository;

import com.recorever.recorever_backend.model.ReportDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface ReportDetailRepository extends JpaRepository<ReportDetail, Integer> {
    Optional<ReportDetail> findByReportReportId(int reportId);

    java.util.List<ReportDetail> findByAdminId(int adminId);
}
