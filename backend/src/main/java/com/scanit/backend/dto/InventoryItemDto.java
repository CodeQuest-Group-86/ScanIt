package com.scanit.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryItemDto {
    private String id;
    private String productId;
    private String productName;
    private double price;
    private int stock;
    private String category;
    private String imageUrl;
    private boolean listed;
}
