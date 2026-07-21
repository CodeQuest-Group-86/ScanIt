package com.scanit.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentInitResponse {
    private String reference;
    private String authorizationUrl;
    private String accessCode;
    private String publicKey;
}
