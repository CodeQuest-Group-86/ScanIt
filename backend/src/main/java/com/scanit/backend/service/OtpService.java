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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.UUID;

@Service
@Slf4j
public class OtpService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    @Value("${twilio.account-sid:}") private String twilioAccountSid;
    @Value("${twilio.auth-token:}")  private String twilioAuthToken;
    @Value("${twilio.verify.service-sid:}") private String twilioServiceSid;

    private static final int OTP_TTL_SECONDS = 600; // 10 minutes

    public OtpService(UserRepository userRepository, PasswordEncoder passwordEncoder, EmailService emailService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    // ── Send OTP ──────────────────────────────────────────────────────────────

    /**
     * Generates a 6-digit OTP and delivers it via email (Resend) or SMS (Twilio).
     * The code is never returned to the client — the user must read it from their inbox/phone.
     */
    public void send(SendOtpRequest req) {
        String contact = req.getContact();
        String channel = req.getChannel();
        String purpose = req.getPurpose();

        User user = findOrCreatePlaceholder(contact, channel, purpose);

        if ("sms".equalsIgnoreCase(channel)) {
            sendViaTwilio(contact, user, purpose);
        } else {
            sendViaResend(contact, user, purpose);
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

    private void sendViaTwilio(String phone, User user, String purpose) {
        if (!hasTwilio()) {
            throw new BadRequestException(
                    "SMS verification is not available right now. Please use email instead.");
        }
        try {
            Twilio.init(twilioAccountSid, twilioAuthToken);
            Verification.creator(twilioServiceSid, phone, "sms").create();
            // Marker only — actual code lives in Twilio Verify, not our DB
            user.setOtpCode("twilio");
            user.setOtpExpiry(Instant.now().plusSeconds(OTP_TTL_SECONDS));
            user.setOtpPurpose(purpose);
            userRepository.save(user);
        } catch (BadRequestException e) {
            throw e;
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

    private void sendViaResend(String email, User user, String purpose) {
        if (!emailService.isConfigured()) {
            log.error("Resend not configured — cannot send OTP email to {}", email);
            throw new BadRequestException(
                    "Email verification is temporarily unavailable. Please try again later.");
        }

        String code = generateCode();
        saveLocalOtp(user, purpose, code);

        boolean isSignup = "signup".equals(purpose);
        String subject = isSignup ? "Your ScanIt verification code" : "Reset your ScanIt password";
        String intro = isSignup
                ? "Enter this code to verify your email and finish creating your account."
                : "Enter this code to reset your ScanIt password.";

        try {
            emailService.send(email, subject, buildOtpEmailHtml(intro, code));
            log.info("OTP email sent to {} (purpose={})", email, purpose);
        } catch (BadRequestException e) {
            // Don't leave a usable OTP if delivery failed
            user.setOtpCode(null);
            user.setOtpExpiry(null);
            user.setOtpPurpose(null);
            userRepository.save(user);
            throw e;
        }
    }

    private String buildOtpEmailHtml(String intro, String code) {
        String body =
                "<div style='padding:36px 32px 8px;text-align:center;'>" +
                "<p style='margin:0 0 28px;color:#7A6050;font-size:15px;line-height:22px;'>" + intro + "</p>" +
                "<table role='presentation' align='center' cellpadding='0' cellspacing='0'><tr>" + digitBoxesHtml(code) + "</tr></table>" +
                "<p style='margin:28px 0 0;color:#A89080;font-size:13px;line-height:20px;'>Expires in 10 minutes. Do not share this code with anyone &mdash; ScanIt staff will never ask for it.</p>" +
                "</div>";
        return emailService.emailShell(body);
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
