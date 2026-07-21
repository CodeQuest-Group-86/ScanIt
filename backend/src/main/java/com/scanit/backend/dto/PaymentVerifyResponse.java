package com.scanit.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentVerifyResponse {
    private String reference;
    private String status;
    private boolean success;
    private double amount;
    private String currency;
    private String paidAt;
    private String channel;
}
