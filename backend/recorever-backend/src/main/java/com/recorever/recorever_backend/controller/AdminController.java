package com.recorever.recorever_backend.controller;

import com.recorever.recorever_backend.model.Report;
import com.recorever.recorever_backend.model.ReportStatus;
import com.recorever.recorever_backend.service.ClaimService;
import com.recorever.recorever_backend.service.DatabaseService;
import com.recorever.recorever_backend.service.ReportService;
import com.recorever.recorever_backend.service.StatusService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN', 'SUPERADMIN')")
public class AdminController {

    @Autowired
    private ReportService reportService;

    @Autowired
    private StatusService statusService;

    @Autowired
    private ClaimService claimService;

    @Autowired
    private DatabaseService databaseService;

    // --- REPORT MANAGEMENT ENDPOINTS ---
    @GetMapping("/reports/pending")
    public ResponseEntity<List<Report>> getPendingReports() {
        return ResponseEntity.ok(reportService.listByStatus(ReportStatus.PENDING));
    }

    @PutMapping("/report/{id}/status")
    public ResponseEntity<?> updateReportStatus(
            @PathVariable int id,
            @RequestBody Map<String, Integer> body) {

        Integer statusId = body.get("status_id");

        if (statusId == null) {
            return ResponseEntity.badRequest()
                    .body("Status field is required.");
        }

        String status = statusService.getById(statusId).getStatusName();

        boolean updated = reportService.adminUpdateStatus(id, status);
        if (!updated) {
            return ResponseEntity.badRequest()
                    .body("Report not found or status update failed.");
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Report status updated to " + status
        ));
    }

    // --- CLAIM MANAGEMENT ENDPOINTS ---
    @GetMapping("/claims")
    public ResponseEntity<?> getAllClaims() {
        return ResponseEntity.ok(claimService.listAllClaimsForAdmin());
    }

    @GetMapping("/dashboard-stats")
    public ResponseEntity<?> getDashboardStats(
            @RequestParam(defaultValue = "15") int days) {
        return ResponseEntity.ok(reportService.getDashboardData(days));
    }

    // --- DATABASE MANAGEMENT ENDPOINTS (SUPERADMIN ONLY) ---
    @GetMapping("/backup")
    @PreAuthorize("hasRole('superadmin')")
    public ResponseEntity<byte[]> downloadBackup() {
        try {
            byte[] backup = databaseService.generateBackup();
            String filename = "recorever_db_" + LocalDate.now() + ".sql";

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .body(backup);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/restore")
    @PreAuthorize("hasRole('superadmin')")
    public ResponseEntity<String> uploadRestore(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty() || !file.getOriginalFilename().endsWith(".sql")) {
            return ResponseEntity.badRequest().body("Please upload a valid .sql file.");
        }

        try {
            databaseService.restoreBackup(file.getInputStream());
            return ResponseEntity.ok("Database restored successfully.");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Restore failed: " + e.getMessage());
        }
    }
}