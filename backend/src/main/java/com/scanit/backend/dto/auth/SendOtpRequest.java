package com.scanit.backend.dto.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class SendOtpRequest {
    @NotBlank private String contact;   // phone (E.164) or email
    @NotBlank private String channel;   // "sms" | "email"
    @NotBlank private String purpose;   // "signup" | "reset-password"
}
