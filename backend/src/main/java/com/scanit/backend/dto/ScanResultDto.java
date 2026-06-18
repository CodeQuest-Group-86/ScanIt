package com.scanit.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScanResultDto {
    private String id;
    private ProductDto product;
    private double confidence;
    private String scannedAt;
    private String authenticityStatus;
    private String imageUri;
}
