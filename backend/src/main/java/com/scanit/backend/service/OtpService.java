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

    /** Publicly hosted so email clients can fetch it — served from this app's own static resources. */
    private static final String LOGO_URL = "https://scanit-raij.onrender.com/api/v1/logo.png";

    /** Explicit timeout — without one, OkHttp's defaults can let a slow/stuck Resend
     *  call hang well past the client's own request timeout instead of failing fast. */
    private final OkHttpClient resendClient = new OkHttpClient.Builder()
            .callTimeout(15, java.util.concurrent.TimeUnit.SECONDS)
            .build();

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

        boolean isSignup = "signup".equals(purpose);
        String subject = isSignup ? "Your ScanIt verification code" : "Reset your ScanIt password";
        String intro = isSignup
                ? "Enter this code to verify your email and finish creating your account."
                : "Enter this code to reset your ScanIt password.";
        String body = buildOtpEmailHtml(intro, code);

        String json = String.format(
                "{\"from\":\"%s\",\"to\":[\"%s\"],\"subject\":\"%s\",\"html\":\"%s\"}",
                resendFrom, email, subject, body.replace("\"", "\\\""));

        Request request = new Request.Builder()
                .url("https://api.resend.com/emails")
                .addHeader("Authorization", "Bearer " + resendApiKey)
                .addHeader("Content-Type", "application/json")
                .post(RequestBody.create(json, MediaType.get("application/json")))
                .build();

        try (Response response = resendClient.newCall(request).execute()) {
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

    /**
     * Attribute values here MUST use single quotes, not double — the whole
     * result gets `"` escaped when it's embedded into the outer JSON payload
     * above, so any double quotes in the markup would come out mangled.
     */
    private String buildOtpEmailHtml(String intro, String code) {
        return String.format(
                // Outer canvas — soft warm gradient, matches the app's cream/orange surface tones
                "<div style='background-color:#FAF0E4;background-image:linear-gradient(180deg,#FFF6EC 0%%,#FAF0E4 55%%,#F2E0C8 100%%);padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;'>" +
                "<div style='max-width:440px;margin:0 auto;background-color:#FFFFFF;border-radius:28px;overflow:hidden;box-shadow:0 20px 40px rgba(62,44,35,0.14);'>" +

                // ── Header banner ──
                "<div style='background-color:#E8682A;background-image:linear-gradient(135deg,#FF9A5C 0%%,#E8682A 55%%,#C4521A 100%%);padding:44px 24px 32px;text-align:center;'>" +
                "<table role='presentation' align='center' cellpadding='0' cellspacing='0' style='margin:0 auto;'><tr><td style='background-color:#FFFFFF;border-radius:22px;padding:14px;box-shadow:0 10px 24px rgba(0,0,0,0.18);'>" +
                "<img src='%s' width='52' height='52' alt='ScanIt' style='display:block;border-radius:12px;' />" +
                "</td></tr></table>" +
                "<p style='margin:20px 0 0;color:#FFFFFF;font-size:24px;font-weight:800;letter-spacing:0.3px;'>Scan<span style='color:#FFE3CC;'>It</span></p>" +
                "<p style='margin:6px 0 0;color:rgba(255,255,255,0.88);font-size:12px;font-weight:500;letter-spacing:0.2px;'>Know it&#39;s real before you buy it</p>" +
                "</div>" +

                // ── Body ──
                "<div style='padding:36px 32px 8px;text-align:center;'>" +
                "<p style='margin:0 0 28px;color:#7A6050;font-size:15px;line-height:22px;'>%s</p>" +
                "<table role='presentation' align='center' cellpadding='0' cellspacing='0'><tr>%s</tr></table>" +
                "<p style='margin:28px 0 0;color:#A89080;font-size:13px;line-height:20px;'>Expires in 10 minutes. Do not share this code with anyone &mdash; ScanIt staff will never ask for it.</p>" +
                "</div>" +

                // ── Footer ──
                "<div style='padding:28px 32px 32px;text-align:center;'>" +
                "<div style='height:1px;background-color:#F0E4D4;margin:0 0 20px;'></div>" +
                "<p style='margin:0;color:#C4B5A5;font-size:11px;line-height:16px;'>This is an automated message from ScanIt &mdash; please don&#39;t reply.</p>" +
                "</div>" +

                "</div>" +
                "</div>",
                LOGO_URL, intro, digitBoxesHtml(code));
    }

    /** Renders each digit of the code in its own box, mirroring the app's own OTP input UI. */
    private String digitBoxesHtml(String code) {
        StringBuilder cells = new StringBuilder();
        for (int i = 0; i < code.length(); i++) {
            cells.append(String.format(
                    "<td style='width:44px;height:54px;border:2px solid #F0E4D4;border-radius:14px;background-color:#FFF8F0;text-align:center;vertical-align:middle;font-size:26px;font-weight:800;color:#1E1410;'>%s</td>",
                    code.charAt(i)));
            if (i < code.length() - 1) {
                cells.append("<td style='width:8px;'></td>");
            }
        }
        return cells.toString();
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
        boolean isSms = "sms".equalsIgnoreCase(channel);
        User placeholder = User.builder()
                .name("")
                .email(isSms ? contact + "@placeholder.scanit" : contact)
                .phoneNumber(isSms ? contact : null)
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
