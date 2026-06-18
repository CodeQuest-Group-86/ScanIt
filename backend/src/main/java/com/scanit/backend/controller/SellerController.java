package com.scanit.backend.controller;

import com.scanit.backend.dto.ApiResponse;
import com.scanit.backend.dto.InventoryItemDto;
import com.scanit.backend.dto.ProductDto;
import com.scanit.backend.dto.SellerDto;
import com.scanit.backend.dto.request.InventoryItemRequest;
import com.scanit.backend.service.SellerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/sellers")
@RequiredArgsConstructor
public class SellerController {

    private final SellerService sellerService;

    // ── Public endpoints ──────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<ApiResponse<List<SellerDto>>> getAllSellers() {
        return ResponseEntity.ok(ApiResponse.success(sellerService.getAllSellers()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SellerDto>> getSeller(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(sellerService.getSeller(id)));
    }

    @GetMapping("/{id}/products")
    public ResponseEntity<ApiResponse<List<ProductDto>>> getSellerProducts(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(sellerService.getSellerProducts(id)));
    }

    // ── Inventory management (SELLER role only) ───────────────────────────────

    @GetMapping("/inventory")
    @PreAuthorize("hasRole('SELLER')")
    public ResponseEntity<ApiResponse<List<InventoryItemDto>>> getInventory(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success(sellerService.getInventory(auth.getName())));
    }

    @PostMapping("/inventory")
    @PreAuthorize("hasRole('SELLER')")
    public ResponseEntity<ApiResponse<InventoryItemDto>> addItem(
            @Valid @RequestBody InventoryItemRequest request,
            Authentication auth
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(sellerService.addInventoryItem(auth.getName(), request)));
    }

    @PutMapping("/inventory/{itemId}")
    @PreAuthorize("hasRole('SELLER')")
    public ResponseEntity<ApiResponse<InventoryItemDto>> updateItem(
            @PathVariable String itemId,
            @Valid @RequestBody InventoryItemRequest request,
            Authentication auth
    ) {
        return ResponseEntity.ok(ApiResponse.success(sellerService.updateInventoryItem(auth.getName(), itemId, request)));
    }

    @DeleteMapping("/inventory/{itemId}")
    @PreAuthorize("hasRole('SELLER')")
    public ResponseEntity<ApiResponse<Void>> deleteItem(
            @PathVariable String itemId,
            Authentication auth
    ) {
        sellerService.deleteInventoryItem(auth.getName(), itemId);
        return ResponseEntity.ok(ApiResponse.success("Item deleted", null));
    }
}
