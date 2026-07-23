package com.scanit.backend.service;

import com.scanit.backend.dto.auth.OtpResetPasswordRequest;
import com.scanit.backend.dto.auth.SendOtpRequest;
import com.scanit.backend.dto.auth.VerifyOtpRequest;
import com.scanit.backend.entity.User;
import com.scanit.backend.exception.BadRequestException;
import com.scanit.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.UUID;

/**
 * Email OTP via Resend (free tier). All sign-up / password-reset codes go out through
 * {@link ResendEmailService} — there is no SMS channel.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OtpService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ResendEmailService resendEmailService;

    private static final int OTP_TTL_SECONDS = 600; // 10 minutes

    // ── Send OTP ──────────────────────────────────────────────────────────────

    /**
     * Returns the OTP code only in dev mode (when Resend isn't configured), so the
     * frontend can pre-fill it. Returns null when Resend actually sent the email.
     */
    public String send(SendOtpRequest req) {
        String email = req.getContact();
        String purpose = req.getPurpose();

        User user = findOrCreatePlaceholder(email, purpose);
        String code = generateCode();
        saveLocalOtp(user, purpose, code);

        if (!resendEmailService.isConfigured()) {
            log.warn("Resend not configured — dev OTP for {}: {}", email, code);
            return code; // returned to frontend for dev pre-fill
        }

        String subject = "signup".equals(purpose)
                ? "Your ScanIt verification code"
                : "Reset your ScanIt password";
        String html = String.format(
                "<p>Your ScanIt code is: <strong style='font-size:24px'>%s</strong></p>" +
                "<p>Valid for 10 minutes. Do not share it.</p>", code);

        resendEmailService.send(email, subject, html);
        return null;
    }

    // ── Verify OTP ────────────────────────────────────────────────────────────

    /**
     * Returns a map containing either resetToken (for reset-password) or signupToken
     * (for signup), depending on the OTP purpose.
     */
    public java.util.Map<String, String> verify(VerifyOtpRequest req) {
        String email = req.getContact();

        User user = findByContact(email)
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

        if (!user.getOtpCode().equals(req.getCode())) {
            throw new BadRequestException("Invalid verification code");
        }

        // Clear OTP — it has been consumed
        user.setOtpCode(null);
        user.setOtpExpiry(null);
        user.setOtpPurpose(null);

        java.util.Map<String, String> tokens = new java.util.HashMap<>();
        if ("reset-password".equals(req.getPurpose())) {
            String resetToken = UUID.randomUUID().toString();
            user.setResetPasswordToken(resetToken);
            user.setResetPasswordTokenExpiry(Instant.now().plusSeconds(900)); // 15 min
            tokens.put("resetToken", resetToken);
        } else if ("signup".equals(req.getPurpose())) {
            String signupToken = UUID.randomUUID().toString();
            user.setSignupToken(signupToken);
            user.setSignupTokenExpiry(Instant.now().plusSeconds(900)); // 15 min
            tokens.put("signupToken", signupToken);
        }

        userRepository.save(user);
        return tokens;
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

    /**
     * For sign-up the user doesn't exist yet, so we create a minimal record just to
     * hold the OTP. AuthService.signUp() will fill in the rest later. For
     * reset-password the user must already exist.
     */
    private User findOrCreatePlaceholder(String email, String purpose) {
        java.util.Optional<User> existing = findByContact(email);

        if (existing.isPresent()) {
            User user = existing.get();
            // A real (non-placeholder) account already owns this email
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
                .email(email)
                .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                .role(com.scanit.backend.enums.UserRole.CONSUMER)
                .build();
        return userRepository.save(placeholder);
    }

    private java.util.Optional<User> findByContact(String email) {
        return userRepository.findByEmail(email);
    }
}
