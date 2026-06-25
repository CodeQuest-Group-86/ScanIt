package com.scanit.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SellerDto {
    private String id;
    private String name;
    private String location;
    private String distance;
    private String phone;
    private String whatsapp;
    private String url;
    private boolean verified;
    private double rating;
    private int reviewCount;
    /** Price of a specific product at this seller — populated when fetching product listings */
    private double price;
}
