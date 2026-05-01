package com.recorever.recorever_backend.service;

import com.recorever.recorever_backend.model.Report;
import com.recorever.recorever_backend.model.ReportDetail;
import com.recorever.recorever_backend.repository.ReportRepository;
import com.recorever.recorever_backend.repository.ReportScheduleRepository;
import com.recorever.recorever_backend.repository.StatusRepository;
import com.recorever.recorever_backend.repository.SurrenderedLocationRepository;
import com.recorever.recorever_backend.repository.UserRepository;
import com.recorever.recorever_backend.repository.CategoryRepository;
import com.recorever.recorever_backend.repository.ClaimRepository;
import com.recorever.recorever_backend.repository.ImageRepository;
import com.recorever.recorever_backend.repository.ReportDetailRepository;
import com.recorever.recorever_backend.model.Category;
import com.recorever.recorever_backend.model.Image;
import com.recorever.recorever_backend.model.ReportSchedule;
import com.recorever.recorever_backend.model.ReportStatus;
import com.recorever.recorever_backend.model.SurrenderedLocation;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.time.format.DateTimeFormatter;
import java.util.stream.Collectors;

@Service
public class ReportService {

    @Autowired
    private ReportRepository repo;

    @Autowired
    private MatchService matchService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private StatusService statusService;

    @Autowired
    private ReportScheduleRepository scheduleRepo;

    @Autowired
    private ImageRepository imageRepo;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ClaimRepository claimRepo;

    @Autowired
    private StatusRepository statusRepo;

    @Autowired
    private CategoryRepository categoryRepo;

    @Autowired
    private ReportDetailRepository reportDetailRepo;

    @Autowired
    private SurrenderedLocationRepository surrenderedLocationRepo;

    private static final int ADMIN_USER_ID = 1;

    @Transactional
    public Map<String, Object> create(int userId, Integer reporterUserId,
                                      String reporterName, String reporterEmail,
                                      String reporterPhone, int statusId,
                                      String type, int categoryId,
                                      String itemName, String location,
                                      Integer surrenderedLocationId,
                                      String description, String dateLostFound) {

        Report report = new Report();
        report.setUserId(userId);
        report.setType(type);
        report.setItemName(itemName);
        report.setLocation(location);
        report.setDescription(description);
        report.setDateLostFound(dateLostFound);
        report.setDeleted(false);
        report.setDateReported(LocalDateTime.now()
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));

        Category category = categoryRepo.findById(categoryId)
                .orElseThrow(() -> new RuntimeException("Category not found with ID: " + categoryId));
        report.setCategory(category);

        if (surrenderedLocationId != null) {
            SurrenderedLocation surrLoc = surrenderedLocationRepo.findById(surrenderedLocationId)
                    .orElseThrow(() -> new RuntimeException("Location not found with ID: " + surrenderedLocationId));
            report.setSurrenderedLocation(surrLoc);
        }

        report.setStatus(statusService.getById(statusId));

        String surrenderCode = null;
        if ("found".equalsIgnoreCase(type)) {
            surrenderCode = UUID.randomUUID().toString()
                    .substring(0, 8).toUpperCase();
            report.setSurrenderCode(surrenderCode);
        }

        Report savedReport = repo.save(report);
        int id = savedReport.getReportId();

        if (reporterUserId != null || reporterName != null ||
            reporterEmail != null || reporterPhone != null) {

            ReportDetail details = new ReportDetail();
            details.setReport(savedReport);

            Integer finalUserId = (reporterUserId != null) ?
                                   reporterUserId : userId;

            details.setUserId(finalUserId);
            details.setPersonName(reporterName);
            details.setPersonContactEmail(reporterEmail);
            details.setPersonContactPhone(reporterPhone);

            if (reporterUserId != null) {
                details.setAdminId(userId);
            }

            reportDetailRepo.save(details);
        }

        if ("lost".equalsIgnoreCase(type)) {
            LocalDate postDate = LocalDate.now();
            LocalTime midnight = LocalTime.MIDNIGHT;

            LocalDateTime n1 = postDate.plusDays(6).atTime(midnight);
            LocalDateTime n2 = postDate.plusDays(7).atTime(midnight);
            LocalDateTime dlt = postDate.plusDays(7).atTime(0, 15, 0);

            ReportSchedule schedule = new ReportSchedule();
            schedule.setReportId(id);
            schedule.setNotify1Time(n1);
            schedule.setNotify2Time(n2);
            schedule.setDeleteTime(dlt);
            scheduleRepo.save(schedule);
        }

        notificationService.create(ADMIN_USER_ID, id, String.format(
                "New PENDING %s report submitted: %s.", type.toUpperCase(), itemName),
                false);

        return Map.of(
            "report_id", id,
            "status", report.getStatus().getStatusName(),
            "type", type,
            "item_name", itemName,
            "surrender_code", surrenderCode != null ? surrenderCode : "N/A");
    }

    @Transactional
    public boolean keepReportActive(int reportId) {
        return scheduleRepo.findByReportId(reportId).map(schedule -> {
            LocalDateTime now = LocalDateTime.now();
            // Reset to new 7-day lifecycle
            schedule.setNotify1Time(now.plusDays(6));
            schedule.setNotify2Time(now.plusDays(7));
            schedule.setDeleteTime(now.plusDays(7).plusMinutes(15));
            
            // Reset flags so warnings trigger again next week
            schedule.setNotify1Sent(false);
            schedule.setNotify2Sent(false);
            
            scheduleRepo.save(schedule);
            return true;
        }).orElse(false);
    }

    public Map<String, Object> listAll(int page, int size) {
        Pageable pageable = PageRequest.of(page - 1, size);
        List<Report> items = repo.findAllActive(pageable);

        items.forEach(report -> {
            userRepository.findById(report.getUserId()).ifPresent(user -> {
                report.setReporterName(user.getFullName());
            });
        });

        int totalItems = (int) repo.countByIsDeletedFalse();
        return createPaginationResponse(items, totalItems, page, size);
    }

    public Map<String, Object> searchReports(Integer userId, String type,
                                             String statusName, String categoryName,
                                             String query, int page, int size) {
        Pageable pageable = PageRequest.of(page - 1, size);
        List<Report> items = repo.searchReports(userId, type, statusName, categoryName, query, pageable);
        int totalItems = repo.countSearchReports(userId, type, statusName, query);

        if (!items.isEmpty()) {
            List<Integer> reportIds = items.stream()
                    .map(Report::getReportId)
                    .collect(Collectors.toList());

            List<Image> allImages = imageRepo
                    .findByReportIdInAndIsDeletedFalse(reportIds);

            Map<Integer, List<Image>> imagesByReportId = allImages.stream()
                    .collect(Collectors.groupingBy(Image::getReportId));

            items.forEach(report -> {
                report.setImages(imagesByReportId
                        .getOrDefault(report.getReportId(), new ArrayList<>()));

                userRepository.findById(report.getUserId()).ifPresent(user -> {
                    report.setReporterName(user.getFullName());
                });

                // Set expiry_date from schedule
                scheduleRepo.findByReportId(report.getReportId()).ifPresent(s -> {
                    if (s.getDeleteTime() != null) {
                        report.setExpiryDate(s.getDeleteTime().toString());
                    }
                });
            });
        }
        return createPaginationResponse(items, totalItems, page, size);
    }

    private Map<String, Object> createPaginationResponse(List<Report> items,
            int totalItems, int page, int size) {
        Map<String, Object> response = new HashMap<>();
        response.put("items", items);
        response.put("totalItems", totalItems);
        response.put("currentPage", page);
        response.put("totalPages", (int) Math.ceil((double) totalItems / size));
        return response;
    }

    public List<Report> listByStatus(String status) {
        return repo.findByStatus_StatusNameAndIsDeletedFalseOrderByDateReportedDesc(status);
    }

    public List<Report> getReportsByType(String type) {
        return repo.findByTypeAndIsDeletedFalseOrderByDateReportedDesc(type);
    }

    public List<Report> getReportsByTypeAndStatus(String type, String status) {
        return repo.findByTypeAndStatus_StatusNameAndIsDeletedFalseOrderByDateReportedDesc(
                type, status);
    }

    @Transactional
    public boolean adminUpdateStatus(int id, String statusName) {
        return repo.findByReportIdAndIsDeletedFalse(id).map(report -> {
            String dateResolved = null;
            if (ReportStatus.CLAIMED.equalsIgnoreCase(statusName) ||
                ReportStatus.REJECTED.equalsIgnoreCase(statusName)) {
                dateResolved = LocalDateTime.now().toString();
            }

            report.setStatus(statusService.getByName(statusName));
            report.setDateResolved(dateResolved);

            if (ReportStatus.APPROVED.equalsIgnoreCase(statusName)) {
                report.setDateResolved(null);

                claimRepo.findByReportIdOrMatchingLostReportId(id, id)
                    .forEach(claim -> {
                        int linkedId = (claim.getReportId() == id)
                            ? (claim.getMatchingLostReportId() != null ? claim.getMatchingLostReportId() : 0)
                            : claim.getReportId();

                        if (linkedId != 0) {
                            repo.findByReportIdAndIsDeletedFalse(linkedId)
                                .ifPresent(linked -> {
                                    String currentLinkedStatus = linked.getStatus().getStatusName();
                                    if (ReportStatus.CLAIMED.equalsIgnoreCase(currentLinkedStatus) ||
                                        ReportStatus.REJECTED.equalsIgnoreCase(currentLinkedStatus)) {
                                            statusRepo.findByStatusName(ReportStatus.APPROVED).ifPresent(approvedStatus -> {
                                                linked.setStatus(approvedStatus);
                                                linked.setDateResolved(null);
                                                repo.save(linked);
                                            });
                                    }
                            });
                        }
                });
            }

            repo.save(report);

            if (ReportStatus.APPROVED.equalsIgnoreCase(statusName)) {
                matchService.findAndCreateMatch(report);
            }

            notificationService.create(report.getUserId(), id, String.format(
                    "Your report for '%s' status changed to '%s'.",
                    report.getItemName(), statusName), true);

            return true;
        }).orElse(false);
    }

    public Report getById(int id) {
        return repo.findByReportIdAndIsDeletedFalse(id).map(report -> {
            List<Image> images = imageRepo.findByReportIdAndIsDeletedFalse(id);
            report.setImages(images);

            reportDetailRepo.findByReportReportId(id).ifPresent(details -> {
                report.setDetails(details);

                if (details.getAdminId() != null) {
                    report.setReporterName(details.getPersonName());
                } else {
                    userRepository.findById(report.getUserId()).ifPresent(user -> {
                        report.setReporterName(user.getFullName());
                    });
                }
            });

            if (report.getDetails() == null) {
                userRepository.findById(report.getUserId()).ifPresent(user -> {
                    report.setReporterName(user.getFullName());
                });
            }

            scheduleRepo.findByReportId(id).ifPresent(schedule -> {
                report.setExpiryDate(schedule.getDeleteTime().toString());
            });

            return report;
        }).orElse(null);
    }

    @Transactional
    public boolean updateEditableFields(int id, String itemName, Integer categoryId,
            String location, Integer surrenderedLocationId, String description) {
        return repo.findByReportIdAndIsDeletedFalse(id).map(report -> {
            if (itemName != null) report.setItemName(itemName);
            if (location != null) report.setLocation(location);
            if (description != null) report.setDescription(description);

            if (categoryId != null) {
                Category category = categoryRepo.findById(categoryId)
                    .orElseThrow(() -> new RuntimeException("Category not found with ID: " + categoryId));
                report.setCategory(category);
            }

            if (surrenderedLocationId != null) {
                SurrenderedLocation surrLoc = surrenderedLocationRepo.findById(surrenderedLocationId)
                    .orElseThrow(() -> new RuntimeException("Location not found with ID: " + surrenderedLocationId));
                report.setSurrenderedLocation(surrLoc);
            }

            repo.save(report);
            return true;
        }).orElse(false);
    }

    @Transactional
    public boolean update(int id, String statusName, String dateResolved) {
        return repo.findByReportIdAndIsDeletedFalse(id).map(report -> {
            report.setStatus(statusService.getByName(statusName));
            report.setDateResolved(dateResolved);
            repo.save(report);
            return true;
        }).orElse(false);
    }

    @Transactional
    public boolean delete(int id) {
        return repo.softDeleteById(id) > 0;
    }

    //Useless???
    @Transactional
    public boolean updateCodes(int id, String surrenderCode, String claimCode) {
        return repo.findByReportIdAndIsDeletedFalse(id).map(report -> {
            report.setSurrenderCode(surrenderCode);
            repo.save(report);
            return true;
        }).orElse(false);
    }

    public Map<String, Object> getDashboardData(int days) {
        int total = repo.countByIsDeletedFalse();
        int claimed = repo.countByStatus_StatusNameAndIsDeletedFalse(ReportStatus.CLAIMED);
        int pending = repo.countByStatus_StatusNameAndIsDeletedFalse(ReportStatus.PENDING);
        int lost = repo.countByTypeAndIsDeletedFalse("lost");
        int found = repo.countByTypeAndIsDeletedFalse("found");

        String ratio = lost + "/" + found;

        List<Map<String, Object>> dbData = repo.getReportsOverTime(days);
        Map<String, Long> dataMap = dbData.stream().collect(Collectors.toMap(
                m -> (String) m.get("label"),
                m -> ((Number) m.get("value")).longValue()));

        List<Map<String, Object>> chartData = new ArrayList<>();
        LocalDate today = LocalDate.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MM-dd");

        for (int i = days - 1; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            String dateKey = date.format(formatter);
            long count = dataMap.getOrDefault(dateKey, 0L);

            Map<String, Object> entry = new HashMap<>();
            entry.put("date", dateKey);
            entry.put("count", count);
            chartData.add(entry);
        }

        Map<String, Object> stats = Map.of(
            "totalReports", total,
            "successfullyClaimed", claimed,
            "pendingAction", pending,
            "lostFoundRatio", ratio
        );

        return Map.of("stats", stats, "reportsOverTime", chartData);
    }

    public List<String> getTopLocations() {
        return repo.getTopLocations();
    }
}