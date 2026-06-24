package com.scanit.backend.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;

@Getter
public class OtpResetPasswordRequest {
    @NotBlank private String contact;
    @NotBlank private String resetToken;
    @NotBlank @Size(min = 6) private String newPassword;
}
