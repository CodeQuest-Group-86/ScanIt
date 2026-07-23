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
    private final ResendEmailService resendEmailService;

    @Value("${app.frontend.url:http://localhost:19006}")
    private String frontendUrl;

    @Value("${app.jwt.access-token-expiration:3600000}")
    private long accessTokenExpiration;

    // ── Sign up ───────────────────────────────────────────────────────────────

    public AuthResponse signUp(SignUpRequest request) {
        // Enforce that OTP was verified before account creation
        User user = userRepository.findBySignupToken(request.getSignupToken())
                .orElseThrow(() -> new BadRequestException("Invalid or expired signup verification. Please request a new code."));

        if (user.getSignupTokenExpiry() == null || user.getSignupTokenExpiry().isBefore(Instant.now())) {
            throw new BadRequestException("Signup verification expired. Please request a new code.");
        }

        // Always assign CONSUMER on sign-up — SELLER must be granted by admin later
        UserRole role = UserRole.CONSUMER;

        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(role);
        if (request.getPhoneNumber() != null && !request.getPhoneNumber().isBlank()) {
            user.setPhoneNumber(request.getPhoneNumber());
        }
        user.setSignupToken(null);
        user.setSignupTokenExpiry(null);
        userRepository.save(user);

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
        java.util.Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            String token = UUID.randomUUID().toString();
            user.setResetPasswordToken(token);
            user.setResetPasswordTokenExpiry(Instant.now().plusSeconds(3600)); // 1 hour
            userRepository.save(user);

            sendPasswordResetEmail(user.getEmail(), user.getName(), token);
        }
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
                .phoneNumber(user.getPhoneNumber())
                .scansCount(user.getScansCount())
                .savedCount(user.getSavedCount())
                .totalSaved(user.getTotalSaved())
                .createdAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null)
                .build();
    }

    private void sendPasswordResetEmail(String to, String name, String token) {
        try {
            String html = String.format(
                    "<p>Hello %s,</p>" +
                    "<p>You requested a password reset for your ScanIt account.</p>" +
                    "<p>Reset token: <strong>%s</strong></p>" +
                    "<p>Or visit: <a href=\"%s/reset-password?token=%s\">%s/reset-password?token=%s</a></p>" +
                    "<p>This link expires in 1 hour. If you did not request this, ignore this email.</p>" +
                    "<p>— The ScanIt Team</p>",
                    name, token, frontendUrl, token, frontendUrl, token
            );
            resendEmailService.send(to, "ScanIt — Reset Your Password", html);
        } catch (Exception e) {
            log.warn("Could not send password reset email to {}: {}", to, e.getMessage());
        }
    }
}
