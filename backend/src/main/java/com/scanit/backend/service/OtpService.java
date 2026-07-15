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

/**
 * OtpService — handles OTP generation, delivery, and verification.
 *
 * SMS provider priority (first configured wins):
 *   1. Arkesel  — free test credits, no credit card, Ghana-native
 *                 Sign up at https://account.arkesel.com/signup
 *   2. Twilio Verify — global, free trial (~$15 credit)
 *                 Sign up at https://www.twilio.com/try-twilio
 *   3. Dev fallback  — no SMS sent; OTP returned in API response body for local testing
 *
 * Email provider:
 *   Resend — 3,000 emails/month free, no credit card
 *   Sign up at https://resend.com
 */
@Service
@Slf4j
public class OtpService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // ── Arkesel (preferred free-tier SMS) ─────────────────────────────────────
    @Value("${arkesel.api-key:}")        private String arkeselApiKey;
    @Value("${arkesel.sender-id:ScanIt}") private String arkeselSenderId;

    // ── Twilio Verify (fallback SMS) ──────────────────────────────────────────
    @Value("${twilio.account-sid:}")           private String twilioAccountSid;
    @Value("${twilio.auth-token:}")            private String twilioAuthToken;
    @Value("${twilio.verify.service-sid:}")    private String twilioServiceSid;

    // ── Resend (email OTP) ────────────────────────────────────────────────────
    @Value("${resend.api-key:}")                          private String resendApiKey;
    @Value("${resend.from:ScanIt <onboarding@resend.dev>}") private String resendFrom;

    private static final int OTP_TTL_SECONDS = 600; // 10 minutes

    public OtpService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // ── Send OTP ──────────────────────────────────────────────────────────────

    /**
     * Sends an OTP via the appropriate channel.
     *
     * Returns the OTP code only in dev mode (no SMS provider configured) so the
     * frontend can pre-fill it for testing. Returns null when a real provider delivers
     * the code.
     */
    public String send(SendOtpRequest req) {
        String contact = req.getContact();
        String channel = req.getChannel();
        String purpose = req.getPurpose();

        User user = findOrCreatePlaceholder(contact, channel, purpose);

        if ("sms".equalsIgnoreCase(channel)) {
            if (hasArkesel()) {
                return sendViaArkesel(contact, user, purpose);
            }
            return sendViaTwilio(contact, user, purpose);
        } else {
            return sendViaResend(contact, user, purpose);
        }
    }

    // ── Verify OTP ────────────────────────────────────────────────────────────

    /**
     * Verifies the OTP submitted by the user.
     *
     * @return a short-lived resetToken when purpose == "reset-password"; null otherwise.
     */
    public String verify(VerifyOtpRequest req) {
        String contact = req.getContact();
        String channel = inferChannel(contact);

        User user = findByContact(contact)
                .orElseThrow(() -> new BadRequestException("No pending verification for this contact"));

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
        if ("sms".equalsIgnoreCase(channel) && hasTwilio() && !hasArkesel()) {
            // Only delegate to Twilio when Arkesel is NOT configured — Arkesel stores
            // the code server-side so we always verify locally for Arkesel.
            valid = checkViaTwilio(contact, req.getCode());
        } else {
            // Arkesel OTP, email OTP, or dev mode — verify against locally stored code
            valid = user.getOtpCode() != null && user.getOtpCode().equals(req.getCode());
        }

        if (!valid) throw new BadRequestException("Invalid verification code");

        // Clear OTP fields
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

    /**
     * Sets a new password using the resetToken returned by {@link #verify}.
     * The new password is bcrypt-hashed and persisted to the database.
     */
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

    // ── Arkesel SMS OTP ───────────────────────────────────────────────────────

    /**
     * Sends OTP via Arkesel's OTP API (https://sms.arkesel.com/api/v2/otp/send).
     * Arkesel generates and delivers the code — we store it locally so we can
     * verify without a second API round-trip.
     *
     * API docs: https://developers.arkesel.com
     * Free test credits available on sign-up — no credit card required.
     */
    private String sendViaArkesel(String phone, User user, String purpose) {
        String code = generateCode();
        saveLocalOtp(user, purpose, code);

        String message = "Your ScanIt verification code is " + code +
                ". Valid for 10 minutes. Do not share it.";

        OkHttpClient client = new OkHttpClient();
        String json = String.format(
                "{\"expiry\":10,\"length\":6,\"medium\":\"sms\"," +
                "\"message\":\"%s\"," +
                "\"number\":\"%s\"," +
                "\"sender_id\":\"%s\"," +
                "\"type\":\"numeric\"}",
                message, phone, arkeselSenderId);

        Request request = new Request.Builder()
                .url("https://sms.arkesel.com/api/v2/otp/send")
                .addHeader("api-key", arkeselApiKey)
                .addHeader("Content-Type", "application/json")
                .post(RequestBody.create(json, MediaType.get("application/json")))
                .build();

        try (Response response = client.newCall(request).execute()) {
            String body = response.body() != null ? response.body().string() : "(empty)";
            if (!response.isSuccessful()) {
                log.error("Arkesel OTP send failed ({}) for {}: {}", response.code(), phone, body);
                throw new BadRequestException("Failed to send SMS via Arkesel. Please try again.");
            }
            // Arkesel success: {"code":"1000","message":"Successful..."}
            if (!body.contains("\"1000\"")) {
                log.error("Arkesel OTP unexpected response for {}: {}", phone, body);
                throw new BadRequestException("Failed to send SMS. Please try again.");
            }
            log.info("Arkesel OTP sent successfully to {}", phone);
        } catch (IOException e) {
            log.error("Arkesel IO error for {}: {}", phone, e.getMessage());
            throw new BadRequestException("Failed to send SMS (network error). Please try again.");
        }
        return null;
    }

    private boolean hasArkesel() {
        return !arkeselApiKey.isBlank();
    }

    // ── Twilio Verify ─────────────────────────────────────────────────────────

    private String sendViaTwilio(String phone, User user, String purpose) {
        if (!hasTwilio()) {
            // No SMS provider configured — dev fallback
            saveLocalOtp(user, purpose);
            String code = user.getOtpCode();
            log.warn("No SMS provider configured — dev OTP for {}: {}", phone, code);
            return code;
        }
        try {
            Twilio.init(twilioAccountSid, twilioAuthToken);
            Verification.creator(twilioServiceSid, phone, "sms").create();
            // Twilio manages the code — store a sentinel so we know OTP is pending
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

    private boolean hasTwilio() {
        return !twilioAccountSid.isBlank() && !twilioAuthToken.isBlank() && !twilioServiceSid.isBlank();
    }

    // ── Resend email OTP ──────────────────────────────────────────────────────

    private String sendViaResend(String email, User user, String purpose) {
        String code = generateCode();
        saveLocalOtp(user, purpose, code);

        if (resendApiKey.isBlank()) {
            log.warn("Resend not configured — dev OTP for {}: {}", email, code);
            return code;
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

    private String inferChannel(String contact) {
        return contact.startsWith("+") || contact.matches("\\d+") ? "sms" : "email";
    }

    /**
     * For sign-up the user doesn't exist yet, so we create a minimal placeholder
     * record just to hold the OTP. AuthService.signUp() fills in the rest later.
     * For reset-password the user must already exist.
     */
    private User findOrCreatePlaceholder(String contact, String channel, String purpose) {
        java.util.Optional<User> existing = findByContact(contact);

        if (existing.isPresent()) {
            User user = existing.get();
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
        return userRepository.findByEmail(contact)
                .or(() -> userRepository.findByPhoneNumber(contact))
                .or(() -> userRepository.findByEmail(contact + "@placeholder.scanit"));
    }
}
