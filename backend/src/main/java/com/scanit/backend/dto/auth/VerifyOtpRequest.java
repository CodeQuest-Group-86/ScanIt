package com.scanit.backend.dto.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class VerifyOtpRequest {
    @NotBlank private String contact;
    @NotBlank private String code;
    @NotBlank private String purpose;
}
