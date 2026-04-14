package com.recorever.recorever_backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.javamail.MimeMessageHelper;
import java.time.LocalDateTime;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    public void sendVerificationCode(
        String toEmail, 
        String code, 
        boolean isResend
    ) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                message, true, "UTF-8"
            );

            helper.setFrom("noreply_test@recorever.site");
            helper.setTo(toEmail);
            helper.setSubject("Verify your PUP Recover Account");

            String expiryMsg = "5 minutes";
            String uniqueId = LocalDateTime.now().toString();

            String html = 
                "<div style='font-family: Arial, sans-serif; max-width: 600px; " +
                "margin: 0 auto; border: 1px solid #e0e0e0; border-radius: " +
                "10px; overflow: hidden; display: block;'>" +
                "<div style='background-color: #800000; padding: 20px; " +
                "text-align: center;'>" +
                "<h1 style='color: white; margin: 0; font-size: 24px;'>" +
                "PUP Recover</h1>" +
                "</div>" +
                "<div style='padding: 30px; text-align: center; color: #333;'>" +
                "<h2 style='color: #800000;'>Email Verification</h2>" +
                "<p style='font-size: 16px;'>Your PUP Recover verification " +
                "code is ready. Please enter this code within the " +
                "application to complete your registration and gain access " +
                "to the lost and found portal.</p>" +
                "<div style='margin: 30px 0; background-color: #f9f9f9; " +
                "border: 2px dashed #800000; padding: 20px; border-radius: " +
                "8px;'>" +
                "<span style='font-size: 32px; font-weight: bold; " +
                "letter-spacing: 10px; color: #800000;'>" + code + "</span>" +
                "</div>" +
                "<p style='font-size: 14px; color: #666;'>This code is " +
                "valid for <b>" + expiryMsg + "</b>. If you didn't request " +
                "this, please ignore this email.</p>" +
                "</div>" +
                "<div style='background-color: #f4f4f4; padding: 20px; " +
                "text-align: center; font-size: 12px; color: #888; " +
                "border-top: 1px solid #e0e0e0;'>" +
                "&copy; 2026 PUP Recover | Polytechnic University of " +
                "the Philippines" +
                "<div style='display:none; visibility:hidden; font-size:1px;'>" +
                uniqueId + "</div>" +
                "</div>" +
                "</div>";

            helper.setText(html, true);
            mailSender.send(message);

        } catch (MessagingException e) {
            throw new RuntimeException("Failed to send styled email", e);
        }
    }
}