package com.scanit.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecommendationDto {
    private String id;
    private ProductDto product;
    private SellerDto seller;
    private double price;
    private double originalPrice;
    private int discountPercent;
    private String thumbnailColor;
}
