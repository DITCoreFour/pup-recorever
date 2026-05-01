package com.recorever.recorever_backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.recorever.recorever_backend.model.ReportStatus;
import com.recorever.recorever_backend.repository.StatusRepository;

@Service
public class StatusService {
    @Autowired
    private StatusRepository statusRepo;

    public ReportStatus getByName(String name) {
        return statusRepo.findByStatusName(name)
            .orElseThrow(() -> new RuntimeException("Status " + name + " not found."));
    }

    public ReportStatus getById(int statusId) {
        return statusRepo.findById(statusId)
            .orElseThrow(() -> new RuntimeException("Status ID " + statusId + " not found"));
    }
}