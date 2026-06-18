package com.scanit.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PriceAlertDto {
    private String id;
    private String productId;
    private String productName;
    private double oldPrice;
    private double newPrice;
    private double dropPercent;
    private String timestamp;
}
