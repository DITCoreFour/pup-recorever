package com.recorever.recorever_backend.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.recorever.recorever_backend.service.UserService;
import com.recorever.recorever_backend.dto.AdminRegistrationDTO;
import com.recorever.recorever_backend.dto.AdminResponseDTO;
import com.recorever.recorever_backend.model.User;

@RestController
@RequestMapping("/api/superadmin")
@PreAuthorize("hasRole('SUPERADMIN')")
public class SuperadminController {

    @Autowired
    private UserService userService;

    private AdminResponseDTO mapToAdminResponseDTO(User user) {
        AdminResponseDTO dto = new AdminResponseDTO();
        dto.setId(user.getUserId()); //
        dto.setName(user.getFirstName() + " " + user.getLastName());
        dto.setEmail(user.getEmail());
        dto.setLocation(userService.getAdminLocationName(user.getUserId()));
        dto.setRole(user.getRole());
        dto.setStatus(user.isDeleted() ? "Inactive" : "Active");

        return dto;
    }

    @GetMapping("/users")
    public ResponseEntity<List<AdminResponseDTO>> getAllAdminAccounts() {
        List<User> adminEntities = userService.getRawAdminsByRole("ADMIN");

        List<AdminResponseDTO> admins = adminEntities.stream()
                .map(this::mapToAdminResponseDTO)
                .toList();

        return ResponseEntity.ok(admins);
    }

    @PostMapping("/register-admin")
    public ResponseEntity<AdminResponseDTO> register(@RequestBody AdminRegistrationDTO dto) {
        User admin = userService.registerAdminAccount(dto);
        return ResponseEntity.ok(mapToAdminResponseDTO(admin));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<AdminResponseDTO> updateAdmin(
        @PathVariable int id, 
        @RequestBody AdminRegistrationDTO updateDto
    ) {
        User updatedUser = userService.updateAdminAccount(id, updateDto);
        return ResponseEntity.ok(mapToAdminResponseDTO(updatedUser));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> softDeleteAdmin(@PathVariable int id) {
        userService.softDeleteAdminAccount(id);
        return ResponseEntity.noContent().build(); // Returns 204 No Content
    }
}