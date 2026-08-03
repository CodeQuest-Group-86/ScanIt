package com.scanit.backend.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.scanit.backend.dto.UserDto;
import com.scanit.backend.dto.auth.*;
import com.scanit.backend.entity.User;
import com.scanit.backend.enums.NotificationType;
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
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final JavaMailSender mailSender;
    private final NotificationService notificationService;

    @Value("${app.mail.from:noreply@scanit.app}")
    private String mailFrom;

    @Value("${app.frontend.url:http://localhost:19006}")
    private String frontendUrl;

    /** Unset by default — the community notification below is skipped entirely until
     *  this is configured, rather than shipping a broken/placeholder invite link. */
    @Value("${community.whatsapp-url:}")
    private String communityWhatsappUrl;

    @Value("${app.jwt.access-token-expiration:3600000}")
    private long accessTokenExpiration;

    @Value("${google.oauth.web-client-id:}")
    private String googleWebClientId;
    @Value("${google.oauth.ios-client-id:}")
    private String googleIosClientId;
    @Value("${google.oauth.android-client-id:}")
    private String googleAndroidClientId;

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
            if (request.getPhoneNumber() != null && !request.getPhoneNumber().isBlank()) {
                placeholder.setPhoneNumber(request.getPhoneNumber());
            }
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
                    .phoneNumber(request.getPhoneNumber())
                    .build();
            user = userRepository.save(user);
        }

        notifyCommunityInvite(user);
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

    // ── Google sign-in ────────────────────────────────────────────────────────

    /**
     * Verifies a Google ID token (signature + audience, via GoogleIdTokenVerifier — not
     * Google's rate-limited tokeninfo endpoint), then finds or creates the matching user.
     * The verifier is built per-call rather than as a Spring bean so a server with no
     * Google client IDs configured yet fails only this one request, not app boot.
     */
    public AuthResponse googleSignIn(String idToken) {
        List<String> audiences = Stream.of(googleWebClientId, googleIosClientId, googleAndroidClientId)
                .filter(id -> id != null && !id.isBlank())
                .collect(Collectors.toList());
        if (audiences.isEmpty()) {
            throw new BadRequestException("Google sign-in is not configured on this server yet.");
        }

        GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(audiences)
                .build();

        GoogleIdToken token;
        try {
            token = verifier.verify(idToken);
        } catch (Exception e) {
            throw new BadRequestException("Could not verify Google sign-in token: " + e.getMessage());
        }
        if (token == null) {
            throw new BadRequestException("Invalid or expired Google sign-in token.");
        }

        GoogleIdToken.Payload payload = token.getPayload();
        String email = payload.getEmail();
        if (email == null || email.isBlank()) {
            throw new BadRequestException("This Google account has no email to sign in with.");
        }

        java.util.Optional<User> existing = userRepository.findByEmail(email);
        User user;
        if (existing.isPresent()) {
            user = existing.get();
        } else {
            String name = (String) payload.get("name");
            String picture = (String) payload.get("picture");
            User created = User.builder()
                    .name(name != null && !name.isBlank() ? name : email)
                    .email(email)
                    // Random bcrypt hash — satisfies the NOT NULL constraint but can never be
                    // used to log in via password, so this account stays Google-only unless the
                    // user later sets a password via "forgot password".
                    .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .role(UserRole.CONSUMER)
                    .avatarUrl(picture)
                    .build();
            user = userRepository.save(created);
            notifyCommunityInvite(user);
        }

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
                .phoneNumber(user.getPhoneNumber())
                .scansCount(user.getScansCount())
                .savedCount(user.getSavedCount())
                .totalSaved(user.getTotalSaved())
                .createdAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null)
                .build();
    }

    /** No-op until community.whatsapp-url is configured — never ships a placeholder/broken link. */
    private void notifyCommunityInvite(User user) {
        if (communityWhatsappUrl == null || communityWhatsappUrl.isBlank()) return;
        try {
            notificationService.notify(
                    user,
                    "Join the ScanIt Community!",
                    "We've started a ScanIt community on WhatsApp — swap tips on how best to scan items, " +
                            "talk pricing, and help each other spot counterfeits. Tap to join: " + communityWhatsappUrl,
                    NotificationType.COMMUNITY
            );
        } catch (Exception e) {
            // Never let a notification failure break sign-up itself.
            log.warn("Failed to send community invite notification to {}: {}", user.getEmail(), e.getMessage());
        }
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
