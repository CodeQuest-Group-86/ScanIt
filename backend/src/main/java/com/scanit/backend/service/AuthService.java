package com.scanit.backend.service;

import com.scanit.backend.dto.UserDto;
import com.scanit.backend.dto.auth.*;
import com.scanit.backend.entity.User;
import com.scanit.backend.enums.UserRole;
import com.scanit.backend.exception.BadRequestException;
import com.scanit.backend.exception.ResourceNotFoundException;
import com.scanit.backend.repository.UserRepository;
import com.scanit.backend.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final JavaMailSender mailSender;

    @Value("${app.mail.from:noreply@scanit.app}")
    private String mailFrom;

    @Value("${app.frontend.url:http://localhost:19006}")
    private String frontendUrl;

    @Value("${app.jwt.access-token-expiration:3600000}")
    private long accessTokenExpiration;

    // ── Sign up ───────────────────────────────────────────────────────────────

    public AuthResponse signUp(SignUpRequest request) {
        UserRole role = UserRole.valueOf(request.getRole().toUpperCase());

        // The OTP flow pre-creates a placeholder user (name="") to store the OTP.
        // If that placeholder exists, update it with the real data instead of rejecting.
        java.util.Optional<User> existing = userRepository.findByEmail(request.getEmail());

        User user;
        if (existing.isPresent()) {
            User placeholder = existing.get();
            if (placeholder.getName() != null && !placeholder.getName().isBlank()) {
                // Real account already exists — reject
                throw new BadRequestException("An account with that email already exists");
            }
            // Placeholder from OTP flow — fill in real data
            placeholder.setName(request.getName());
            placeholder.setPassword(passwordEncoder.encode(request.getPassword()));
            placeholder.setRole(role);
            placeholder.setOtpCode(null);
            placeholder.setOtpExpiry(null);
            placeholder.setOtpPurpose(null);
            user = userRepository.save(placeholder);
        } else {
            user = User.builder()
                    .name(request.getName())
                    .email(request.getEmail())
                    .password(passwordEncoder.encode(request.getPassword()))
                    .role(role)
                    .build();
            user = userRepository.save(user);
        }

        return buildAuthResponse(user);
    }

    // ── Sign in ───────────────────────────────────────────────────────────────

    public AuthResponse signIn(SignInRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return buildAuthResponse(user);
    }

    // ── Forgot password ───────────────────────────────────────────────────────

    public void forgotPassword(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("No account found with that email"));

        String token = UUID.randomUUID().toString();
        user.setResetPasswordToken(token);
        user.setResetPasswordTokenExpiry(Instant.now().plusSeconds(3600)); // 1 hour
        userRepository.save(user);

        sendPasswordResetEmail(user.getEmail(), user.getName(), token);
    }

    // ── Reset password ────────────────────────────────────────────────────────

    public void resetPassword(String token, String newPassword) {
        User user = userRepository.findByResetPasswordToken(token)
                .orElseThrow(() -> new BadRequestException("Invalid or expired reset token"));

        if (user.getResetPasswordTokenExpiry().isBefore(Instant.now())) {
            throw new BadRequestException("Reset token has expired. Please request a new one.");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setResetPasswordToken(null);
        user.setResetPasswordTokenExpiry(null);
        userRepository.save(user);
    }

    // ── Refresh token ─────────────────────────────────────────────────────────

    public AuthResponse refreshToken(String refreshToken) {
        String email = jwtService.extractUsername(refreshToken);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!jwtService.isTokenValid(refreshToken, user)) {
            throw new BadRequestException("Invalid or expired refresh token");
        }

        String tokenType = jwtService.extractTokenType(refreshToken);
        if (!"refresh".equals(tokenType)) {
            throw new BadRequestException("Invalid token type: expected refresh token");
        }

        return buildAuthResponse(user);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private AuthResponse buildAuthResponse(User user) {
        return AuthResponse.builder()
                .user(toDto(user))
                .accessToken(jwtService.generateAccessToken(user))
                .refreshToken(jwtService.generateRefreshToken(user))
                .expiresAt(System.currentTimeMillis() + accessTokenExpiration)
                .build();
    }

    public UserDto toDto(User user) {
        return UserDto.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name().toLowerCase())
                .avatarUrl(user.getAvatarUrl())
                .scansCount(user.getScansCount())
                .savedCount(user.getSavedCount())
                .totalSaved(user.getTotalSaved())
                .createdAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null)
                .build();
    }

    private void sendPasswordResetEmail(String to, String name, String token) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailFrom);
            message.setTo(to);
            message.setSubject("ScanIt — Reset Your Password");
            message.setText(String.format(
                    "Hello %s,%n%n" +
                    "You requested a password reset for your ScanIt account.%n%n" +
                    "Reset token: %s%n%n" +
                    "Or visit: %s/reset-password?token=%s%n%n" +
                    "This link expires in 1 hour. If you did not request this, ignore this email.%n%n" +
                    "— The ScanIt Team",
                    name, token, frontendUrl, token
            ));
            mailSender.send(message);
        } catch (Exception e) {
            log.warn("Could not send password reset email to {}: {}", to, e.getMessage());
        }
    }
}
