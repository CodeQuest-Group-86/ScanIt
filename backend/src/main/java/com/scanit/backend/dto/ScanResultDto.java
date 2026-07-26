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
    /** AI-generated explanation of the authenticity read (premium feature). Null for barcode
     *  lookups or when Gemini didn't return one. */
    private String authenticityReason;
    private String imageUri;
    /** Google Search URL — opens in device browser. */
    private String googleSearchUrl;
    /** DuckDuckGo search URL used for seller discovery. */
    private String duckDuckGoSearchUrl;
}
