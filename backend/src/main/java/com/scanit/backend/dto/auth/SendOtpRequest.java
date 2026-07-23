package com.scanit.backend.dto.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class SendOtpRequest {
    @NotBlank private String contact;   // email address
    @NotBlank private String purpose;   // "signup" | "reset-password"
}
