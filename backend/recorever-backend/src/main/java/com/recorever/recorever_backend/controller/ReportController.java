package com.recorever.recorever_backend.controller;

// Service & Repository Imports
import com.recorever.recorever_backend.model.Report;
import com.recorever.recorever_backend.model.ReportStatus;
import com.recorever.recorever_backend.model.User;
import com.recorever.recorever_backend.repository.UserRepository;
import com.recorever.recorever_backend.service.ReportService;
import com.recorever.recorever_backend.service.StatusService;

// Image Imports
import com.recorever.recorever_backend.service.ImageService;
import com.recorever.recorever_backend.service.MatchService;
import com.recorever.recorever_backend.model.Image;

// DTO imports
import com.recorever.recorever_backend.dto.ReportCreationDTO;
import com.recorever.recorever_backend.dto.ReportResponseDTO;
import com.recorever.recorever_backend.dto.ImageResponseDTO;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api")
public class ReportController {

    @Autowired
    private ReportService service;

    @Autowired
    private ImageService imageService;

    @Autowired
    private MatchService matchService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ReportService reportService;

    @Autowired
    private StatusService statusService;

    private ImageResponseDTO convertToImageDto(Image image) {
        if (image == null || image.isDeleted()) return null;

        ImageResponseDTO dto = new ImageResponseDTO();
        dto.setImageId(image.getImageId());
        dto.setFileName(image.getFileName());
        dto.setFileType(image.getFileType());
        dto.setReportId(image.getReportId());
        dto.setUploadedAt(image.getUploadedAt());

        String imageUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/api/image/download/")
                .path(image.getFilePath())
                .toUriString();
        dto.setImageUrl(imageUrl);

        return dto;
    }

    private ReportResponseDTO mapToReportResponseDTO(Report report) {
        ReportResponseDTO dto = new ReportResponseDTO();
        dto.setReport_id(report.getReportId());
        dto.setUser_id(report.getUserId());
        dto.setType(report.getType());
        dto.setItem_name(report.getItemName());
        dto.setLocation(report.getLocation());
        dto.setDate_lost_found(report.getDateLostFound());
        dto.setDate_reported(report.getDateReported());
        dto.setDate_resolved(report.getDateResolved());
        dto.setDescription(report.getDescription());

        if (report.getDetails() != null) {
            ReportResponseDTO.ReportDetailResponse detailDto = new ReportResponseDTO.ReportDetailResponse(
                report.getDetails().getUserId(),
                report.getDetails().getPersonName(),
                report.getDetails().getPersonContactEmail(),
                report.getDetails().getPersonContactPhone(),
                report.getDetails().getAdminId() != null ? report.getDetails().getAdminId() : 0
            );
            dto.setReporter_details(detailDto);

            dto.setUser_id(report.getDetails().getUserId());
            dto.setReporter_name(report.getDetails().getPersonName());
            dto.setReporter_email(report.getDetails().getPersonContactEmail());
            dto.setReporter_phone(report.getDetails().getPersonContactPhone());
        } else {
            User reporter = userRepository.findById(report.getUserId()).orElse(null);
            if (reporter != null) {
                dto.setReporter_name(reporter.getFullName());
                dto.setReporter_profile_picture(reporter.getProfilePicture());
            }

            dto.setReporter_details(null);
        }

        ReportResponseDTO.StatusResponse status = new ReportResponseDTO.StatusResponse(
            report.getStatus().getStatusId(),
            report.getStatus().getStatusName()
        );

        dto.setStatus(status);

        if (report.getCategory() != null) {
            ReportResponseDTO.CategoryResponse category =
                new ReportResponseDTO.CategoryResponse(
                    report.getCategory().getCategoryId(),
                    report.getCategory().getCategoryName()
                );

            dto.setCategory(category);
        }

        if (report.getSurrenderedLocation() != null) {
            ReportResponseDTO.SurrenderLocationResponse surrenderedLocation =
                new ReportResponseDTO.SurrenderLocationResponse(
                    report.getSurrenderedLocation().getSurrenderedLocationId(),
                    report.getSurrenderedLocation().getSurrenderedLocationName()
                );

            dto.setSurrendered_location(surrenderedLocation);
        }

        dto.setSurrender_code(report.getSurrenderCode());
        dto.setReporter_name(report.getReporterName());
        dto.setExpiry_date(report.getExpiryDate());

        Authentication auth = SecurityContextHolder
                .getContext().getAuthentication();
        boolean isOwnerOrAdmin = false;

        if (auth != null && auth.getPrincipal() instanceof User) {
            User currentUser = (User) auth.getPrincipal();
            boolean isOwner = (report.getUserId() == currentUser.getUserId());
            boolean isAdmin = currentUser.getRole()
                .equalsIgnoreCase("ADMIN");
            isOwnerOrAdmin = isOwner || isAdmin;
        }

        if (isOwnerOrAdmin && !ReportStatus.RESOLVED
            .equalsIgnoreCase(report.getStatus().getStatusName())) {
            dto.setExpiry_date(report.getExpiryDate());
        } else {
            dto.setExpiry_date(null);
        }

        if (report.getImages() != null) {
            dto.setImages(report.getImages().stream()
                    .filter(img -> !img.isDeleted())
                    .map(this::convertToImageDto)
                    .collect(Collectors.toList()));
        }

        return dto;
    }

    @PostMapping("/reports/full-submit")
    public ResponseEntity<ReportResponseDTO> submitFullReport(
            Authentication authentication,
            @Valid @ModelAttribute ReportCreationDTO reportDto) {

        User authenticatedUser = (User) authentication.getPrincipal();
        int userId = authenticatedUser.getUserId();

        Map<String, Object> creationResult = service.create(
                userId,
                reportDto.getReported_by_user_id(),
                reportDto.getReported_by(),
                reportDto.getReporter_email(),
                reportDto.getReporter_phone(),
                reportDto.getStatus(),
                reportDto.getType(),
                reportDto.getCategory_id(),
                reportDto.getItem_name(),
                reportDto.getLocation(),
                reportDto.getSurrendered_location_id(),
                reportDto.getDescription(),
                reportDto.getDate_lost_found()
        );

        Integer newReportId = (Integer) creationResult.get("report_id");
        List<MultipartFile> files = reportDto.getFiles();

        if (files != null && !files.isEmpty() && files.get(0).getSize() > 0) {
            files.forEach(file -> {
                String uniqueName = imageService.storeFile(file);
                Image image = new Image(
                        file.getOriginalFilename(),
                        file.getContentType(),
                        uniqueName,
                        newReportId
                );
                imageService.saveImageMetadata(image);
            });
        }

        Report finalReport = service.getById(newReportId);
        if (finalReport == null) {
            return ResponseEntity.status(500).body(null);
        }

        return ResponseEntity.status(201)
                .body(mapToReportResponseDTO(finalReport));
    }

    // @PostMapping("/report")
    // public ResponseEntity<?> createReport(
    //         Authentication authentication,
    //         @Valid @RequestBody ReportCreationDTO reportDto) {

    //     User authUser = (User) authentication.getPrincipal();
    //     Map<String, Object> result = service.create(
    //             authUser.getUserId(),
    //             reportDto.getType(),
    //             reportDto.getCategory_id(),
    //             reportDto.getItem_name(),
    //             reportDto.getLocation(),
    //             reportDto.getSurrendered_location_id(),
    //             reportDto.getDescription(),
    //             reportDto.getDate_lost_found()
    //     );
    //     return ResponseEntity.status(201).body(result);
    // }

    @GetMapping("/reports")
    public ResponseEntity<Map<String, Object>> getReports(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Integer status,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Integer user_id,
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {

        String statusName = null;
        if (status != null) {
            statusName = statusService.getById(status).getStatusName();
        }

        Map<String, Object> serviceResponse = service.searchReports(
                user_id, type, statusName, category, query, page, size);

        @SuppressWarnings("unchecked")
        List<Report> reports = (List<Report>) serviceResponse.get("items");

        List<ReportResponseDTO> dtos = reports.stream()
                .map(this::mapToReportResponseDTO)
                .collect(Collectors.toList());

        serviceResponse.put("items", dtos);
        return ResponseEntity.ok(serviceResponse);
    }

    @GetMapping("reports/type/{type}")
    public ResponseEntity<List<ReportResponseDTO>> getReportsByType(
            @PathVariable String type,
            @RequestParam(required = false) String status) {

        List<Report> reports = (status != null && !status.isEmpty())
                ? service.getReportsByTypeAndStatus(type, status)
                : service.getReportsByType(type);

        List<ReportResponseDTO> responseList = reports.stream()
                .map(this::mapToReportResponseDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(responseList);
    }

    @GetMapping("/reports/top-locations")
    public ResponseEntity<List<String>> getTopLocations() {
        return ResponseEntity.ok(service.getTopLocations());
    }

    @GetMapping("/report/{id}")
    public ResponseEntity<?> getReport(@PathVariable int id) {
        Report report = service.getById(id);
        if (report == null) {
            return ResponseEntity.status(404).body("Report not found");
        }
        return ResponseEntity.ok(mapToReportResponseDTO(report));
    }

    @PutMapping("/report/{id}")
    public ResponseEntity<ReportResponseDTO> updateReport(
            Authentication authentication,
            @PathVariable int id,
            @Valid @ModelAttribute ReportCreationDTO reportDto) {

        Report report = service.getById(id);
        if (report == null) return ResponseEntity.status(404).body(null);

        User authUser = (User) authentication.getPrincipal();
        if (report.getUserId() != authUser.getUserId() ||
                !report.getStatus().getStatusName().equalsIgnoreCase(ReportStatus.PENDING)) {
            return ResponseEntity.status(403).body(null);
        }

        service.updateEditableFields(
                id,
                reportDto.getItem_name(),
                reportDto.getCategory_id(),
                reportDto.getLocation(),
                reportDto.getSurrendered_location_id(),
                reportDto.getDescription()
        );

        List<MultipartFile> files = reportDto.getFiles();
        if (files != null && !files.isEmpty() && files.get(0).getSize() > 0) {
            files.forEach(file -> {
                String uniqueName = imageService.storeFile(file);
                Image image = new Image(
                        file.getOriginalFilename(),
                        file.getContentType(),
                        uniqueName,
                        id
                );
                imageService.saveImageMetadata(image);
            });
        }

        return ResponseEntity.ok(mapToReportResponseDTO(service.getById(id)));
    }

    @DeleteMapping("/report/{id}")
    public ResponseEntity<?> deleteReport(
            Authentication authentication,
            @PathVariable int id) {

        Report report = service.getById(id);
        if (report == null) return ResponseEntity.status(404).body("Not found");

        User authUser = (User) authentication.getPrincipal();
        if (report.getUserId() != authUser.getUserId()) {
            return ResponseEntity.status(403).body("Not authorized");
        }

        boolean deleted = service.delete(id);
        if (!deleted) return ResponseEntity.status(404).body("Already deleted");

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Report deleted successfully."
        ));
    }

    @PutMapping("/report/{id}/codes")
    public ResponseEntity<?> updateCodes(
            Authentication authentication,
            @PathVariable int id,
            @RequestParam String surrender_code,
            @RequestParam String claim_code) {
        return ResponseEntity.status(403).body("This endpoint is deprecated.");
    }

    @GetMapping("/reports/{reportId}/potential-matches/{claimantId}")
    public ResponseEntity<List<Report>> getPotentialMatches(
            @PathVariable int reportId,
            @PathVariable int claimantId) {
        Report foundReport = service.getById(reportId);

        if (foundReport == null) {
            return ResponseEntity.notFound().build();
        }

        List<Report> matches = matchService
            .findPotentialMatchesForUser(foundReport, claimantId);
        return ResponseEntity.ok(matches);
    }
    @PostMapping("/reports/{id}/keep-active")
    public ResponseEntity<?> keepReportActive(@PathVariable int id) {
        boolean success = reportService.keepReportActive(id);
        return success ? ResponseEntity.ok().build() 
            : ResponseEntity.notFound().build();
    }
}