package com.scanit.backend.service;

import com.scanit.backend.dto.auth.OtpResetPasswordRequest;
import com.scanit.backend.dto.auth.SendOtpRequest;
import com.scanit.backend.dto.auth.VerifyOtpRequest;
import com.scanit.backend.entity.User;
import com.scanit.backend.exception.BadRequestException;
import com.scanit.backend.repository.UserRepository;
import com.twilio.Twilio;
import com.twilio.rest.verify.v2.service.Verification;
import com.twilio.rest.verify.v2.service.VerificationCheck;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
public class OtpService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${twilio.account-sid:}") private String twilioAccountSid;
    @Value("${twilio.auth-token:}")  private String twilioAuthToken;
    @Value("${twilio.verify.service-sid:}") private String twilioServiceSid;

    @Value("${resend.api-key:}") private String resendApiKey;
    @Value("${resend.from:onboarding@resend.dev}") private String resendFrom;

    private static final int OTP_TTL_SECONDS = 600; // 10 minutes

    public OtpService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // ── Send OTP ──────────────────────────────────────────────────────────────

    /**
     * Returns the OTP code only in dev mode (when Twilio/Resend not configured),
     * so the frontend can pre-fill it. Returns null when a real provider is used.
     */
    public String send(SendOtpRequest req) {
        String contact = req.getContact();
        String channel = req.getChannel();
        String purpose = req.getPurpose();

        User user = findOrCreatePlaceholder(contact, channel, purpose);

        if ("sms".equalsIgnoreCase(channel)) {
            return sendViaTwilio(contact, user, purpose);
        } else {
            return sendViaResend(contact, user, purpose);
        }
    }

    // ── Verify OTP ────────────────────────────────────────────────────────────

    /**
     * Returns a resetToken when purpose is "reset-password", null otherwise.
     */
    public String verify(VerifyOtpRequest req) {
        String contact = req.getContact();
        String channel = inferChannel(contact);

        User user = findByContact(contact)
                .orElseThrow(() -> new BadRequestException("No pending verification for this contact"));

        // Check whether an OTP was ever sent (or was already used) before anything else
        if (user.getOtpCode() == null || user.getOtpExpiry() == null || user.getOtpPurpose() == null) {
            throw new BadRequestException("No active OTP found. Please request a new one.");
        }

        if (Instant.now().isAfter(user.getOtpExpiry())) {
            throw new BadRequestException("OTP has expired. Please request a new one.");
        }

        if (!user.getOtpPurpose().equals(req.getPurpose())) {
            throw new BadRequestException("OTP was not requested for this purpose");
        }

        boolean valid;
        if ("sms".equalsIgnoreCase(channel) && hasTwilio()) {
            valid = checkViaTwilio(contact, req.getCode());
        } else {
            // Email OTP or Twilio not configured — verify locally stored code
            valid = user.getOtpCode() != null && user.getOtpCode().equals(req.getCode());
        }

        if (!valid) throw new BadRequestException("Invalid verification code");

        // Clear OTP
        user.setOtpCode(null);
        user.setOtpExpiry(null);

        String resetToken = null;
        if ("reset-password".equals(req.getPurpose())) {
            resetToken = UUID.randomUUID().toString();
            user.setResetPasswordToken(resetToken);
            user.setResetPasswordTokenExpiry(Instant.now().plusSeconds(900)); // 15 min
        }

        user.setOtpPurpose(null);
        userRepository.save(user);
        return resetToken;
    }

    // ── OTP password reset ────────────────────────────────────────────────────

    public void resetPassword(OtpResetPasswordRequest req) {
        User user = findByContact(req.getContact())
                .orElseThrow(() -> new BadRequestException("User not found"));

        if (user.getResetPasswordToken() == null ||
                !user.getResetPasswordToken().equals(req.getResetToken())) {
            throw new BadRequestException("Invalid or expired reset token");
        }
        if (user.getResetPasswordTokenExpiry().isBefore(Instant.now())) {
            throw new BadRequestException("Reset token has expired. Please start over.");
        }

        user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        user.setResetPasswordToken(null);
        user.setResetPasswordTokenExpiry(null);
        userRepository.save(user);
    }

    // ── Twilio Verify ─────────────────────────────────────────────────────────

    private String sendViaTwilio(String phone, User user, String purpose) {
        if (!hasTwilio()) {
            saveLocalOtp(user, purpose);
            String code = user.getOtpCode();
            log.warn("Twilio not configured — dev OTP for {}: {}", phone, code);
            return code; // returned to frontend for dev pre-fill
        }
        try {
            Twilio.init(twilioAccountSid, twilioAuthToken);
            Verification.creator(twilioServiceSid, phone, "sms").create();
            user.setOtpCode("twilio");
            user.setOtpExpiry(Instant.now().plusSeconds(OTP_TTL_SECONDS));
            user.setOtpPurpose(purpose);
            userRepository.save(user);
            return null;
        } catch (Exception e) {
            log.error("Twilio send failed for {}: {}", phone, e.getMessage());
            throw new BadRequestException("Failed to send SMS. Check the phone number and try again.");
        }
    }

    private boolean checkViaTwilio(String phone, String code) {
        if (!hasTwilio()) return false;
        try {
            Twilio.init(twilioAccountSid, twilioAuthToken);
            VerificationCheck check = VerificationCheck.creator(twilioServiceSid)
                    .setTo(phone).setCode(code).create();
            return "approved".equalsIgnoreCase(check.getStatus().toString());
        } catch (Exception e) {
            log.error("Twilio check failed: {}", e.getMessage());
            return false;
        }
    }

    // ── Resend email ──────────────────────────────────────────────────────────

    private String sendViaResend(String email, User user, String purpose) {
        String code = generateCode();
        saveLocalOtp(user, purpose, code);

        if (resendApiKey.isBlank()) {
            log.warn("Resend not configured — dev OTP for {}: {}", email, code);
            return code; // returned to frontend for dev pre-fill
        }

        String subject = "signup".equals(purpose)
                ? "Your ScanIt verification code"
                : "Reset your ScanIt password";
        String body = String.format(
                "<p>Your ScanIt code is: <strong style='font-size:24px'>%s</strong></p>" +
                "<p>Valid for 10 minutes. Do not share it.</p>", code);

        OkHttpClient client = new OkHttpClient();
        String json = String.format(
                "{\"from\":\"%s\",\"to\":[\"%s\"],\"subject\":\"%s\",\"html\":\"%s\"}",
                resendFrom, email, subject, body.replace("\"", "\\\""));

        Request request = new Request.Builder()
                .url("https://api.resend.com/emails")
                .addHeader("Authorization", "Bearer " + resendApiKey)
                .addHeader("Content-Type", "application/json")
                .post(RequestBody.create(json, MediaType.get("application/json")))
                .build();

        try (Response response = client.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                String resendBody = response.body() != null ? response.body().string() : "(no body)";
                log.error("Resend failed ({}) from='{}': {}", response.code(), resendFrom, resendBody);
                throw new BadRequestException(
                        "Email send failed (Resend " + response.code() + "): " + resendBody);
            }
        } catch (IOException e) {
            log.error("Resend IO error: {}", e.getMessage());
            throw new BadRequestException("Failed to send email (network error): " + e.getMessage());
        }
        return null;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private boolean hasTwilio() {
        return !twilioAccountSid.isBlank() && !twilioAuthToken.isBlank() && !twilioServiceSid.isBlank();
    }

    private String generateCode() {
        return String.format("%06d", new SecureRandom().nextInt(1_000_000));
    }

    private void saveLocalOtp(User user, String purpose) {
        saveLocalOtp(user, purpose, generateCode());
    }

    private void saveLocalOtp(User user, String purpose, String code) {
        user.setOtpCode(code);
        user.setOtpExpiry(Instant.now().plusSeconds(OTP_TTL_SECONDS));
        user.setOtpPurpose(purpose);
        userRepository.save(user);
    }

    private String purpose(User user) {
        return user.getOtpPurpose() != null ? user.getOtpPurpose() : "";
    }

    private String inferChannel(String contact) {
        return contact.startsWith("+") || contact.matches("\\d+") ? "sms" : "email";
    }

    /**
     * For sign-up the user doesn't exist yet, so we create a minimal record
     * just to hold the OTP. AuthService.signUp() will fill in the rest later.
     * For reset-password the user must already exist.
     */
    private User findOrCreatePlaceholder(String contact, String channel, String purpose) {
        java.util.Optional<User> existing = findByContact(contact);

        if (existing.isPresent()) {
            User user = existing.get();
            // A real (non-placeholder) account already owns this contact
            if ("signup".equals(purpose) && user.getName() != null && !user.getName().isBlank()) {
                throw new BadRequestException("An account with that email already exists. Please sign in.");
            }
            return user;
        }

        if ("reset-password".equals(purpose)) {
            throw new BadRequestException("No account found for that contact");
        }

        // Create placeholder — no password yet, filled during sign-up
        User placeholder = User.builder()
                .name("")
                .email("sms".equalsIgnoreCase(channel) ? contact + "@placeholder.scanit" : contact)
                .phoneNumber(contact)
                .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                .role(com.scanit.backend.enums.UserRole.CONSUMER)
                .build();
        return userRepository.save(placeholder);
    }

    private java.util.Optional<User> findByContact(String contact) {
        // Try email first, then phone
        return userRepository.findByEmail(contact)
                .or(() -> userRepository.findByPhoneNumber(contact))
                .or(() -> userRepository.findByEmail(contact + "@placeholder.scanit"));
    }
}
