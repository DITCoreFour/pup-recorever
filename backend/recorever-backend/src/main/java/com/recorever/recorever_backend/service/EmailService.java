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

    private static final String VERIFY_EMAIL = "noreply_test@recorever.site";
    private static final String UPDATE_EMAIL = "noreply_test@recorever.site";
    private static final String FOOTER = 
        "&copy; 2026 PUPT Recover | Polytechnic University of the Philippines Taguig";

    public void sendVerificationCode(
        String toEmail, 
        String code, 
        boolean isResend
    ) {
        try {
        String uniqueId = LocalDateTime.now().toString();
        String html = 
            "<div style='font-family: Arial, sans-serif; max-width: 600px; " +
            "margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; " +
            "overflow: hidden; display: block;'>" +
            "<div style='background-color: #800000; padding: 20px; " +
            "text-align: center;'><h1 style='color: white; margin: 0; " +
            "font-size: 24px;'>PUPT Recover</h1></div>" +
            "<div style='padding: 30px; text-align: center; color: #333;'>" +
            "<h2 style='color: #800000;'>Email Verification</h2>" +
            "<p>Your PUPT Recover verification code is ready. Enter this " +
            "code to complete your registration.</p>" +
            "<div style='margin: 30px 0; background-color: #f9f9f9; " +
            "border: 2px dashed #800000; padding: 20px; border-radius: 8px;'>" +
            "<span style='font-size: 32px; font-weight: bold; " +
            "letter-spacing: 10px; color: #800000;'>" + code + "</span></div>" +
            "<p style='font-size: 14px; color: #666;'>Valid for 5 minutes. " +
            "If you didn't request this, ignore this email.</p></div>" +
            "<div style='background-color: #f4f4f4; padding: 20px; " +
            "text-align: center; font-size: 12px; color: #888; " +
            "border-top: 1px solid #e0e0e0;'>" + FOOTER +
            "<div style='display:none; visibility:hidden; font-size:1px;'>" +
            uniqueId + "</div></div></div>";

        sendEmail(toEmail,
            VERIFY_EMAIL, 
            "Verify your PUPT Recover Account",
            html);
        } catch (Exception e) {
            throw new RuntimeException("Failed to send verification email", e);
        }
    }

    public void sendGeneralNotification(
        String toEmail,
        String subject,
        String bodyContent) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                message, true, "UTF-8"
            );
            String uniqueId = LocalDateTime.now().toString();

            helper.setFrom(UPDATE_EMAIL);
            helper.setTo(toEmail);
            helper.setSubject(subject);

            String html = 
                "<div style='font-family: Arial, sans-serif; max-width: 600px; " +
                "margin: 0 auto; border: 1px solid #e0e0e0; border-radius: " +
                "10px; overflow: hidden; display: block;'>" +
                "<div style='background-color: #800000; padding: 20px; " +
                "text-align: center;'><h1 style='color: white; margin: 0; " +
                "font-size: 24px;'>PUPT Recover</h1></div>" +
                "<div style='padding: 30px; color: #333;'>" +
                "<h3>Notification Update:</h3>" +
                "<p style='font-size: 16px; line-height: 1.5;'>" + 
                bodyContent + "</p></div>" +
                "<div style='background-color: #f4f4f4; padding: 20px; " +
                "text-align: center; font-size: 12px; color: #888; " +
                "border-top: 1px solid #e0e0e0;'>" + FOOTER + 
                "<div style='margin-top: 10px; font-size: 10px; color: #aaa;'>" +
                "Reference ID: " + uniqueId + "</div></div></div>";

            helper.setText(html, true);
            mailSender.send(message);
        } catch (MessagingException e) {
            throw new RuntimeException("Failed to send email", e);
        }
    }

    public void sendPasswordResetCode(String toEmail, String code) {
        try {
            String html = 
                "<div style='font-family: Arial, sans-serif; max-width: 600px; " +
                "margin: 0 auto; border: 1px solid #e0e0e0; border-radius: " +
                "10px; overflow: hidden;'>" +
                "<div style='background-color: #800000; padding: 20px; " +
                "text-align: center;'><h1 style='color: white; margin: 0; " +
                "font-size: 24px;'>PUPT Recover</h1></div>" +
                "<div style='padding: 30px; text-align: center; " +
                "color: #333;'>" +
                "<h2 style='color: #800000;'>Password Reset Request</h2>" +
                "<p>We received a request to reset your password. Use the " +
                "code below to proceed with the reset process.</p>" +
                "<div style='margin: 30px 0; background-color: #f9f9f9; " +
                "border: 2px dashed #800000; padding: 20px; " +
                "border-radius: 8px;'>" +
                "<span style='font-size: 32px; font-weight: bold; " +
                "letter-spacing: 10px; color: #800000;'>" + code + 
                "</span></div>" +
                "<p style='font-size: 14px; color: #666;'>This code is " +
                "valid for 5 minutes. If you did not request a password " +
                "reset, please secure your account.</p></div>" +
                "<div style='background-color: #f4f4f4; padding: 20px; " +
                "text-align: center; font-size: 12px; color: #888; " +
                "border-top: 1px solid #e0e0e0;'>" + FOOTER + "</div>" +
                "</div>";

            sendEmail(toEmail, 
                VERIFY_EMAIL, 
                "Reset your PUPT Recover Password", 
                html
            );
        } catch (Exception e) {
            throw new RuntimeException("Failed to send reset email", e);
        }
    }

    private void sendEmail(
        String toEmail,
        String fromEmail,
        String subject,
        String content) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = 
                new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(content, true);
            mailSender.send(message);
        } catch (MessagingException e) {
            throw new RuntimeException("Failed to send email", e);
        }
    }
}