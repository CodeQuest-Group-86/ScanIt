package com.scanit.backend.controller;

import com.scanit.backend.dto.ApiResponse;
import com.scanit.backend.dto.UserDto;
import com.scanit.backend.dto.auth.*;
import com.scanit.backend.entity.User;
import com.scanit.backend.service.AuthService;
import com.scanit.backend.service.OtpService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final OtpService otpService;

    @PostMapping("/sign-up")
    public ResponseEntity<ApiResponse<AuthResponse>> signUp(@Valid @RequestBody SignUpRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Account created successfully", authService.signUp(request)));
    }

    @PostMapping("/sign-in")
    public ResponseEntity<ApiResponse<AuthResponse>> signIn(@Valid @RequestBody SignInRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Login successful", authService.signIn(request)));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request.getEmail());
        return ResponseEntity.ok(ApiResponse.success("Password reset email sent. Check your inbox.", null));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request.getToken(), request.getNewPassword());
        return ResponseEntity.ok(ApiResponse.success("Password reset successfully", null));
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(ApiResponse.success(authService.refreshToken(request.getRefreshToken())));
    }

    /** Returns the authenticated user's profile from their JWT. */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> getMe(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(ApiResponse.success(authService.toDto(user)));
    }

    // ── OTP endpoints ─────────────────────────────────────────────────────────

    /** Step 1 — send a 6-digit OTP via SMS (Twilio Verify) or email (Resend). */
    @PostMapping("/otp/send")
    public ResponseEntity<ApiResponse<Void>> sendOtp(@Valid @RequestBody SendOtpRequest req) {
        otpService.send(req);
        return ResponseEntity.ok(ApiResponse.success("OTP sent", null));
    }

    /** Step 2 — verify the code. Returns resetToken for reset-password purpose. */
    @PostMapping("/otp/verify")
    public ResponseEntity<ApiResponse<java.util.Map<String, String>>> verifyOtp(@Valid @RequestBody VerifyOtpRequest req) {
        String resetToken = otpService.verify(req);
        java.util.Map<String, String> data = resetToken != null
                ? java.util.Map.of("resetToken", resetToken)
                : java.util.Map.of();
        return ResponseEntity.ok(ApiResponse.success("OTP verified", data));
    }

    /** Step 3 (reset-password only) — set a new password using the resetToken. */
    @PostMapping("/otp/reset-password")
    public ResponseEntity<ApiResponse<Void>> otpResetPassword(@Valid @RequestBody OtpResetPasswordRequest req) {
        otpService.resetPassword(req);
        return ResponseEntity.ok(ApiResponse.success("Password updated successfully", null));
    }
}
