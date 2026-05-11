package com.recorever.recorever_backend.service;

import com.recorever.recorever_backend.config.JwtUtil;
import com.recorever.recorever_backend.dto.AdminRegistrationDTO;
import com.recorever.recorever_backend.model.SecurityCode;
import com.recorever.recorever_backend.model.SurrenderedLocation;
import com.recorever.recorever_backend.model.User;
import com.recorever.recorever_backend.repository.UserRepository;
import com.recorever.recorever_backend.repository.ReportRepository;
import com.recorever.recorever_backend.repository.SecurityCodeRepository;
import com.recorever.recorever_backend.repository.SurrenderedLocationRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.List;

@Service
public class UserService {

    @Autowired
    private UserRepository repo;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private ReportRepository reportRepo;

    @Autowired
    private SecurityCodeRepository securityCodeRepo;

    @Autowired
    private SurrenderedLocationRepository locationRepo;

    @Autowired
    private EmailService emailService;

    public List<User> getRawAdminsByRole(String role) {
        return repo.findAllByRole(role);
    }

    public String getAdminLocationName(int adminId) {
        return locationRepo.findByAdminIdAndIsDeletedFalse(adminId)
                .map(SurrenderedLocation::getSurrenderedLocationName)
                .orElse("Unassigned");
    }

    @Transactional
    public User registerAdminAccount(AdminRegistrationDTO dto) {
        // 1. Search for existing user (Search and Promote Logic)
        // We use findByEmail instead of findByEmailAndIsDeletedFalse because we want 
        // to find them even if they were previously soft-deleted.
        Optional<User> existingUser = repo.findByEmail(dto.getEmail());
        
        User user;
        if (existingUser.isPresent()) {
            // SCENARIO: User exists, promote them to ADMIN
            user = existingUser.get();
            user.setRole("ADMIN");
            user.setDeleted(false); // Make them active immediately
        } else {
            // SCENARIO: Brand new user
            user = new User();
            
            // Split full name from DTO
            String[] nameParts = dto.getName().split(" ", 2);
            user.setFirstName(nameParts[0]);
            user.setLastName(nameParts.length > 1 ? nameParts[1] : "");
            
            user.setEmail(dto.getEmail());
            // Using BCrypt just like your student register method
            user.setPasswordHash(BCrypt.hashpw(dto.getPassword(), BCrypt.gensalt()));
            user.setRole("ADMIN");
            user.setDeleted(false); // Admins created by Superadmin don't need verification
            user.setCreatedAt(LocalDateTime.now().toString());
        }
        
        // Save to users table
        User savedUser = repo.save(user);

        // 2. Handle Location Assignment in the separate table
        SurrenderedLocation location = locationRepo
            .findByAdminIdAndIsDeletedFalse(savedUser.getUserId())
            .orElse(new SurrenderedLocation());

        location.setAdminId(savedUser.getUserId());
        location.setSurrenderedLocationName(dto.getAssignedLocation());
        location.setDeleted(false);
        
        locationRepo.save(location);

        return savedUser;
    }

    @Transactional
    public User updateAdminAccount(int userId, AdminRegistrationDTO dto) {
        // 1. Find the existing user
        User user = repo.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("Admin not found with ID: " + userId));

        // 2. Update basic info (Skip password!)
        String[] nameParts = dto.getName().split(" ", 2);
        user.setFirstName(nameParts[0]);
        user.setLastName(nameParts.length > 1 ? nameParts[1] : "");
        user.setEmail(dto.getEmail());
        
        User savedUser = repo.save(user);

        // 3. Update the Location in the separate table
        SurrenderedLocation location = locationRepo
            .findByAdminIdAndIsDeletedFalse(userId)
            .orElse(new SurrenderedLocation());

        location.setAdminId(savedUser.getUserId());
        location.setSurrenderedLocationName(dto.getAssignedLocation());
        location.setDeleted(false);
        
        locationRepo.save(location);

        return savedUser;
    }

    @Transactional
    public void softDeleteAdminAccount(int userId) {
        // 1. Mark the User as deleted
        User user = repo.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("Admin not found with ID: " + userId));
        
        user.setDeleted(true); 
        repo.save(user);

        // 2. Mark the Location assignment as deleted
        locationRepo.findByAdminIdAndIsDeletedFalse(userId).ifPresent(location -> {
            location.setDeleted(true);
            locationRepo.save(location);
        });
    }

    private int getAdminUserId() {
        return repo.findFirstByRoleAndIsDeletedFalse("admin")
                .map(User::getUserId)
                .orElseGet(() -> 
                    // Fallback to standard superadmin if no admin is found
                    repo.findFirstByRoleAndIsDeletedFalse("superadmin")
                        .map(User::getUserId)
                        .orElse(1) // Safety fallback
                );
    }

    public static class ChangePasswordRequest {
        private String oldPassword;
        private String newPassword;

        public String getOldPassword() { return oldPassword; }
        public void setOldPassword(String old) { this.oldPassword = old; }
        public String getNewPassword() { return newPassword; }
        public void setNewPassword(String n) { this.newPassword = n; }
    }

    @Transactional
    public int register(
        String firstName, 
        String lastName, 
        String email, 
        String pwd, 
        Integer programId, 
        Integer year
    ) {
        if (repo.isEmailTaken(email, 0)) {
        throw new IllegalArgumentException("Email is already in use.");
        }

        repo.deleteInactiveUserByEmail(email);

        User user = new User();
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setEmail(email);
        user.setPasswordHash(BCrypt.hashpw(pwd, BCrypt.gensalt()));
        user.setProgramId(programId);
        user.setYear(year);
        user.setRole("user");
        user.setDeleted(true); // Account is inactive until verified
        user.setCreatedAt(LocalDateTime.now().toString());

        User savedUser = repo.save(user);

        // Generate and send the 5-digit code
        sendNewVerificationCode(savedUser.getUserId(), email, false);

        return savedUser.getUserId();
    }

    @Transactional
    public void sendNewVerificationCode(
        int userId, 
        String email, 
        boolean isResend
    ) {
        // Generate a random 5-digit code
        String code = String.valueOf((int) (Math.random() * 90000) + 10000);

        SecurityCode sc = new SecurityCode();
        sc.setUserId(userId);
        sc.setVerificationToken(code);
        sc.setType("EMAIL_VERIFICATION");
        sc.setVerified(false);
        sc.setCreatedAt(LocalDateTime.now());

        LocalDateTime expiryTime = isResend
                ? LocalDateTime.now().plusSeconds(60)
                : LocalDateTime.now().plusMinutes(5);

        sc.setExpiresAt(expiryTime);
        securityCodeRepo.save(sc);

        emailService.sendVerificationCode(email, code, isResend);
    }

    @Transactional
    public boolean verifyUserEmail(String token) {
        SecurityCode code = securityCodeRepo.findByVerificationToken(token)
                .orElseThrow(() -> new IllegalArgumentException(
                    "Invalid verification code."));

        if (code.isVerified()) {
            throw new IllegalArgumentException(
                "This code has already been used.");
        }

        if (code.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException(
                "Verification code has expired. Please request a new one.");
        }

        // Activate User
        repo.findById(code.getUserId()).ifPresent(user -> {
            user.setDeleted(false);
            repo.save(user);
        });

        code.setVerified(true);
        securityCodeRepo.save(code);
        return true;
    }

    @Transactional
    public void cancelRegistration(String email) {
        repo.findByEmail(email).ifPresent(user -> {
            if (user.isDeleted()) {
                securityCodeRepo.deleteByUserId(user.getUserId());
                repo.delete(user);
            }
        });
    }

    @Transactional
    public void initiatePasswordReset(String email) {
        User user = repo.findByEmailAndIsDeletedFalse(email)
                .orElseThrow(() -> new IllegalArgumentException("Email not found."));

        String code = String.valueOf((int) (Math.random() * 90000) + 10000);

        SecurityCode sc = new SecurityCode();
        sc.setUserId(user.getUserId());
        sc.setVerificationToken(code);
        sc.setType("PASSWORD_RESET");
        sc.setVerified(false);
        sc.setCreatedAt(LocalDateTime.now());
        sc.setExpiresAt(LocalDateTime.now().plusMinutes(5));
        
        securityCodeRepo.save(sc);
        emailService.sendPasswordResetCode(email, code);
    }

    @Transactional
    public boolean verifyResetCode(String token) {
        SecurityCode code = securityCodeRepo.findByVerificationToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Invalid reset code."));

        if (!"PASSWORD_RESET".equals(code.getType())) {
            throw new IllegalArgumentException("This code is not valid for password resets.");
        }

        if (code.isVerified() || code.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Reset code has expired or already been used.");
        }

        code.setVerified(true);
        securityCodeRepo.save(code);
        return true;
    }

    @Transactional
    public void completePasswordReset(String email, String token, String newPassword) {
        SecurityCode code = securityCodeRepo.findByVerificationToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Invalid token."));

        if (!"PASSWORD_RESET".equals(code.getType()) || !code.isVerified()) {
            throw new IllegalArgumentException("Token not verified or invalid request.");
        }

        repo.findByEmailAndIsDeletedFalse(email).ifPresentOrElse(user -> {
            user.setPasswordHash(BCrypt.hashpw(newPassword, BCrypt.gensalt()));
            repo.save(user);
        }, () -> {
            throw new IllegalArgumentException("User no longer exists.");
        });

        securityCodeRepo.delete(code);
    }

    public Map<String, Object> login(String email, String password) {
        User user = repo.findByEmailAndIsDeletedFalse(email)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Invalid email or password"));

        if (!BCrypt.checkpw(password, user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        String accessToken = jwtUtil.generateToken(
                user.getUserId(), user.getFullName());
        String refreshToken = UUID.randomUUID().toString();
        
        user.setRefreshToken(refreshToken);
        user.setRefreshTokenExpiry(LocalDateTime.now().plusDays(7));
        repo.save(user);

        return Map.of(
                "accessToken", accessToken,
                "refreshToken", refreshToken,
                "user", user);
    }

    @Transactional
    public Map<String, Object> refreshTokens(User user) {
        String newAT = jwtUtil.generateToken(user.getUserId(), user.getFullName());
        String newRT = UUID.randomUUID().toString();

        user.setRefreshToken(newRT);
        user.setRefreshTokenExpiry(LocalDateTime.now().plusDays(7));
        repo.save(user);

        return Map.of(
                "accessToken", newAT,
                "refreshToken", newRT,
                "user", user);
    }

    @Transactional
    public Map<String, Object> updateUserProfile(
        User user, String name, String email, 
        Integer programId, Integer year, String profilePicture
    ) {
        int userId = user.getUserId();

        // temporary solution: split full name
        String firstName = null;
        String lastName = null;

        if (name != null && !name.isEmpty()) {
            String[] parts = name.split(" ", 2);
            firstName = parts[0];
            lastName = parts.length > 1 ? parts[1] : "";
        }

        if (firstName != null && !firstName.equals(user.getFirstName())) {
            user.setFirstName(firstName);
        }

        if (lastName != null && !lastName.equals(user.getLastName())) {
            user.setLastName(lastName);
        }

        if (email != null && !email.isEmpty() && 
                !email.equals(user.getEmail())) {
            if (repo.isEmailTaken(email, userId)) {
                return Map.of("error", "Email is already in use.");
            }
            user.setEmail(email);
        }

        if (programId != null) {
            user.setProgramId(programId);
        }
        
        if (year != null) {
            user.setYear(year);
        }

        if (profilePicture != null && !profilePicture.isEmpty()) {
            user.setProfilePicture(profilePicture);
        }

        repo.save(user);
        return Map.of("success", true);
    }

    @Transactional
    public void changePassword(User user, String oldPwd, String newPwd) {
        if (!BCrypt.checkpw(oldPwd, user.getPasswordHash())) {
            throw new IllegalArgumentException("Incorrect old password");
        }

        String pattern = "^(?=.*[0-9])(?=.*[!@#$%^&*(),.?\":{}|<>]).{8,}$";
        if (!newPwd.matches(pattern)) {
            throw new IllegalArgumentException(
                    "Password requires a number and special character.");
        }

        user.setPasswordHash(BCrypt.hashpw(newPwd, BCrypt.gensalt()));
        repo.save(user);
    }

    public boolean emailExists(String email) {
        return repo.findByEmailAndIsDeletedFalse(email).isPresent();
    }

    @Transactional
    public boolean resetUserPassword(String email, String newPassword) {
        return repo.findByEmailAndIsDeletedFalse(email).map(user -> {
            user.setPasswordHash(BCrypt.hashpw(newPassword, BCrypt.gensalt()));
            repo.save(user);
            return true;
        }).orElse(false);
    }

    @Transactional
    public void deleteAccount(int userId) {
        repo.softDeleteUser(userId);        
        reportRepo.softDeleteLostReportsByUserId(userId);
        reportRepo.transferFoundReportsToAdmin(userId, getAdminUserId());
    }
}