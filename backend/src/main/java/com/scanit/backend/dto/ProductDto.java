package com.scanit.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductDto {
    private String id;
    private String name;
    private String brand;
    private String category;
    private String description;
    private String imageUrl;
    private double price;
    private String currency;
    private String origin;
    private Map<String, String> specs;
    private String barcode;
    private boolean verified;
    private String authenticity;
    private List<SellerDto> sellers;
}
