package com.scanit.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.util.UUID;

/**
 * OtpService — generates, delivers, and verifies one-time passwords.
 *
 * SMS provider priority (first configured wins):
 *   1. Termii  — free signup, free trial balance, no credit card
 *                Sign up at https://app.termii.com/register
 *                Dashboard → Settings → API Key
 *   2. Twilio Verify — global fallback (~$15 trial credit, card required for intl)
 *                Sign up at https://www.twilio.com/try-twilio
 *   3. Dev fallback  — no SMS sent; OTP returned in API response body for local testing
 *
 * Email provider:
 *   Resend — 3,000 emails/month free, no credit card
 *   Sign up at https://resend.com
 *
 * Termii flow:
 *   send  → POST /api/sms/otp/send  → returns { pinId }  → stored in user.termiiPinId
 *   verify → POST /api/sms/otp/verify → { api_key, pin_id, pin } → { verified: "True" }
 */
@Service
@Slf4j
public class OtpService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // ── Termii (preferred free-tier SMS) ──────────────────────────────────────
    @Value("${termii.api-key:}")         private String termiiApiKey;
    @Value("${termii.sender-id:ScanIt}") private String termiiSenderId;
    @Value("${termii.channel:generic}")  private String termiiChannel;
    private static final String TERMII_BASE = "https://v3.api.termii.com";

    // ── Twilio Verify (fallback SMS) ──────────────────────────────────────────
    @Value("${twilio.account-sid:}")        private String twilioAccountSid;
    @Value("${twilio.auth-token:}")         private String twilioAuthToken;
    @Value("${twilio.verify.service-sid:}") private String twilioServiceSid;

    // ── Resend (email OTP) ────────────────────────────────────────────────────
    @Value("${resend.api-key:}")                             private String resendApiKey;
    @Value("${resend.from:ScanIt <onboarding@resend.dev>}")  private String resendFrom;

    private static final int OTP_TTL_SECONDS = 600; // 10 minutes

    public OtpService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // ── Send OTP ──────────────────────────────────────────────────────────────

    /**
     * Sends an OTP to the user's phone (SMS) or inbox (email).
     *
     * @return devCode (6-digit string) in dev/test mode so the app can pre-fill it;
     *         null when a real provider was used.
     */
    public String send(SendOtpRequest req) {
        String contact = req.getContact();
        String channel = req.getChannel();
        String purpose = req.getPurpose();

        User user = findOrCreatePlaceholder(contact, channel, purpose);

        if ("sms".equalsIgnoreCase(channel)) {
            if (hasTermii()) {
                return sendViaTermii(contact, user, purpose);
            }
            return sendViaTwilio(contact, user, purpose);
        } else {
            return sendViaResend(contact, user, purpose);
        }
    }

    // ── Verify OTP ────────────────────────────────────────────────────────────

    /**
     * Verifies the code submitted by the user.
     *
     * @return a short-lived resetToken when purpose == "reset-password"; null otherwise.
     */
    public String verify(VerifyOtpRequest req) {
        String contact  = req.getContact();
        String channel  = inferChannel(contact);

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
        if ("sms".equalsIgnoreCase(channel) && hasTermii() && user.getTermiiPinId() != null) {
            // Termii manages the code server-side; verify via their API
            valid = checkViaTermii(user.getTermiiPinId(), req.getCode());
        } else if ("sms".equalsIgnoreCase(channel) && hasTwilio() && !hasTermii()) {
            // Twilio fallback
            valid = checkViaTwilio(contact, req.getCode());
        } else {
            // Email OTP or dev-mode — verify against locally stored code
            valid = user.getOtpCode().equals(req.getCode());
        }

        if (!valid) throw new BadRequestException("Invalid verification code");

        // Clear OTP state
        user.setOtpCode(null);
        user.setOtpExpiry(null);
        user.setTermiiPinId(null);

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

    // ── Reset password ────────────────────────────────────────────────────────

    /**
     * Sets a new password using the resetToken returned by {@link #verify}.
     * The password is bcrypt-hashed and persisted to the database.
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

    // ── Termii SMS OTP ────────────────────────────────────────────────────────

    /**
     * Sends OTP via Termii Send Token API.
     *
     * POST https://v3.api.termii.com/api/sms/otp/send
     * Response: { "pinId": "...", "smsStatus": "Message Sent", ... }
     * The pinId is stored on the user and passed to Termii Verify Token API later.
     *
     * Sign up free (no card): https://app.termii.com/register
     * Dashboard → Settings → API Key
     */
    private String sendViaTermii(String phone, User user, String purpose) {
        // Termii expects E.164 without the + (e.g. 2330241234567)
        String normalised = phone.startsWith("+") ? phone.substring(1) : phone;

        String json = String.format(
                "{\"api_key\":\"%s\"," +
                "\"message_type\":\"NUMERIC\"," +
                "\"to\":\"%s\"," +
                "\"from\":\"%s\"," +
                "\"channel\":\"%s\"," +
                "\"pin_attempts\":3," +
                "\"pin_time_to_live\":10," +
                "\"pin_length\":6," +
                "\"pin_placeholder\":\"<otp>\"," +
                "\"message_text\":\"Your ScanIt verification code is <otp>. Valid for 10 minutes. Do not share it.\"," +
                "\"pin_type\":\"NUMERIC\"}",
                termiiApiKey, normalised, termiiSenderId, termiiChannel);

        OkHttpClient client = new OkHttpClient();
        Request request = new Request.Builder()
                .url(TERMII_BASE + "/api/sms/otp/send")
                .addHeader("Content-Type", "application/json")
                .post(RequestBody.create(json, MediaType.get("application/json")))
                .build();

        try (Response response = client.newCall(request).execute()) {
            String body = response.body() != null ? response.body().string() : "(empty)";
            if (!response.isSuccessful()) {
                log.error("Termii send failed ({}) for {}: {}", response.code(), phone, body);
                throw new BadRequestException("Failed to send SMS via Termii. Please try again.");
            }
            JsonNode node = objectMapper.readTree(body);
            String pinId = node.path("pinId").asText(null);
            if (pinId == null || pinId.isBlank()) {
                log.error("Termii send: missing pinId in response for {}: {}", phone, body);
                throw new BadRequestException("Failed to send SMS. Please try again.");
            }

            // Persist pinId + OTP metadata (code stored as sentinel "termii")
            user.setTermiiPinId(pinId);
            user.setOtpCode("termii");               // sentinel — actual code is on Termii's side
            user.setOtpExpiry(Instant.now().plusSeconds(OTP_TTL_SECONDS));
            user.setOtpPurpose(purpose);
            userRepository.save(user);

            log.info("Termii OTP sent to {} (pinId: {})", phone, pinId);
        } catch (IOException e) {
            log.error("Termii IO error for {}: {}", phone, e.getMessage());
            throw new BadRequestException("Failed to send SMS (network error). Please try again.");
        }
        return null; // real SMS sent — no devCode
    }

    /**
     * Verifies OTP via Termii Verify Token API.
     *
     * POST https://v3.api.termii.com/api/sms/otp/verify
     * Body: { api_key, pin_id, pin }
     * Response: { "verified": "True", ... } on success
     */
    private boolean checkViaTermii(String pinId, String pin) {
        String json = String.format(
                "{\"api_key\":\"%s\",\"pin_id\":\"%s\",\"pin\":\"%s\"}",
                termiiApiKey, pinId, pin);

        OkHttpClient client = new OkHttpClient();
        Request request = new Request.Builder()
                .url(TERMII_BASE + "/api/sms/otp/verify")
                .addHeader("Content-Type", "application/json")
                .post(RequestBody.create(json, MediaType.get("application/json")))
                .build();

        try (Response response = client.newCall(request).execute()) {
            String body = response.body() != null ? response.body().string() : "(empty)";
            if (!response.isSuccessful()) {
                log.error("Termii verify failed ({}): {}", response.code(), body);
                return false;
            }
            JsonNode node = objectMapper.readTree(body);
            return "True".equalsIgnoreCase(node.path("verified").asText("False"));
        } catch (IOException e) {
            log.error("Termii verify IO error: {}", e.getMessage());
            return false;
        }
    }

    private boolean hasTermii() {
        return !termiiApiKey.isBlank();
    }

    // ── Twilio Verify (fallback) ───────────────────────────────────────────────

    private String sendViaTwilio(String phone, User user, String purpose) {
        if (!hasTwilio()) {
            // No SMS provider configured — dev fallback
            String code = generateCode();
            saveLocalOtp(user, purpose, code);
            log.warn("No SMS provider configured — dev OTP for {}: {}", phone, code);
            return code;
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
            log.error("Twilio verify failed: {}", e.getMessage());
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
        String htmlBody = String.format(
                "<p>Your ScanIt code is: <strong style='font-size:24px'>%s</strong></p>" +
                "<p>Valid for 10 minutes. Do not share it.</p>", code);

        OkHttpClient client = new OkHttpClient();
        String json = String.format(
                "{\"from\":\"%s\",\"to\":[\"%s\"],\"subject\":\"%s\",\"html\":\"%s\"}",
                resendFrom, email, subject, htmlBody.replace("\"", "\\\""));

        Request request = new Request.Builder()
                .url("https://api.resend.com/emails")
                .addHeader("Authorization", "Bearer " + resendApiKey)
                .addHeader("Content-Type", "application/json")
                .post(RequestBody.create(json, MediaType.get("application/json")))
                .build();

        try (Response response = client.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                String resBody = response.body() != null ? response.body().string() : "(no body)";
                log.error("Resend failed ({}) from='{}': {}", response.code(), resendFrom, resBody);
                // Surface actionable guidance for common Resend free-tier limits
                if (resBody.contains("verify a domain") || resBody.contains("own email address")) {
                    throw new BadRequestException(
                            "Email delivery is limited until a custom domain is verified on Resend. " +
                            "Verify a domain at resend.com/domains, then set RESEND_FROM to an address on that domain.");
                }
                if (resBody.contains("Invalid `to` field") || resBody.contains("testing email")) {
                    throw new BadRequestException(
                            "Cannot send to that email address with the current Resend setup. " +
                            "Use a real inbox, or verify a domain at resend.com/domains for production.");
                }
                throw new BadRequestException("Failed to send verification email. Please try again shortly.");
            }
        } catch (BadRequestException e) {
            throw e;
        } catch (IOException e) {
            log.error("Resend IO error: {}", e.getMessage());
            throw new BadRequestException("Failed to send email (network error). Please try again.");
        }
        return null;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String generateCode() {
        return String.format("%06d", new SecureRandom().nextInt(1_000_000));
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
     * Finds an existing user by contact (email or phone), or creates a minimal
     * placeholder record so the OTP can be stored before the account is fully created.
     * AuthService.signUp() fills the placeholder with real data when the user completes sign-up.
     */
    private User findOrCreatePlaceholder(String contact, String channel, String purpose) {
        java.util.Optional<User> existing = findByContact(contact);

        if (existing.isPresent()) {
            User user = existing.get();
            if ("signup".equals(purpose) && user.getName() != null && !user.getName().isBlank()) {
                throw new BadRequestException("An account with that contact already exists. Please sign in.");
            }
            return user;
        }

        if ("reset-password".equals(purpose)) {
            throw new BadRequestException("No account found for that contact");
        }

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
