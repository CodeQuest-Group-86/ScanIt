package com.scanit.backend.service;

import com.scanit.backend.dto.InventoryItemDto;
import com.scanit.backend.dto.ProductDto;
import com.scanit.backend.dto.SellerDto;
import com.scanit.backend.dto.request.InventoryItemRequest;
import com.scanit.backend.entity.InventoryItem;
import com.scanit.backend.entity.Product;
import com.scanit.backend.entity.Seller;
import com.scanit.backend.entity.User;
import com.scanit.backend.exception.BadRequestException;
import com.scanit.backend.exception.ResourceNotFoundException;
import com.scanit.backend.repository.InventoryItemRepository;
import com.scanit.backend.repository.ProductRepository;
import com.scanit.backend.repository.SellerRepository;
import com.scanit.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SellerService {

    private final SellerRepository sellerRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final ProductService productService;

    // ── Public read ───────────────────────────────────────────────────────────

    public List<SellerDto> getAllSellers() {
        return sellerRepository.findAll().stream()
                .map(s -> toDto(s, 0))
                .collect(Collectors.toList());
    }

    public SellerDto getSeller(String id) {
        return toDto(findSeller(id), 0);
    }

    public List<ProductDto> getSellerProducts(String sellerId) {
        Seller seller = findSeller(sellerId);
        return inventoryItemRepository.findBySellerAndListedTrue(seller)
                .stream()
                .map(item -> productService.toDto(item.getProduct()))
                .collect(Collectors.toList());
    }

    // ── Seller inventory management (SELLER role) ─────────────────────────────

    public List<InventoryItemDto> getInventory(String userEmail) {
        Seller seller = findSellerByEmail(userEmail);
        return inventoryItemRepository.findBySeller(seller)
                .stream().map(this::toInventoryDto).collect(Collectors.toList());
    }

    public InventoryItemDto addInventoryItem(String userEmail, InventoryItemRequest req) {
        Seller seller = findSellerByEmail(userEmail);
        Product product = productRepository.findById(req.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

        InventoryItem item = inventoryItemRepository.save(
                InventoryItem.builder()
                        .seller(seller)
                        .product(product)
                        .price(req.getPrice())
                        .stock(req.getStock())
                        .listed(req.isListed())
                        .build()
        );

        return toInventoryDto(item);
    }

    public InventoryItemDto updateInventoryItem(String userEmail, String itemId, InventoryItemRequest req) {
        Seller seller = findSellerByEmail(userEmail);
        InventoryItem item = inventoryItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory item not found"));

        if (!item.getSeller().getId().equals(seller.getId())) {
            throw new BadRequestException("You are not authorized to update this item");
        }

        item.setPrice(req.getPrice());
        item.setStock(req.getStock());
        item.setListed(req.isListed());

        return toInventoryDto(inventoryItemRepository.save(item));
    }

    public void deleteInventoryItem(String userEmail, String itemId) {
        Seller seller = findSellerByEmail(userEmail);
        InventoryItem item = inventoryItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory item not found"));

        if (!item.getSeller().getId().equals(seller.getId())) {
            throw new BadRequestException("You are not authorized to delete this item");
        }

        inventoryItemRepository.delete(item);
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    public SellerDto toDto(Seller seller, double price) {
        return SellerDto.builder()
                .id(seller.getId())
                .name(seller.getName())
                .location(seller.getLocation())
                .distance("N/A")
                .phone(seller.getPhone())
                .whatsapp(seller.getWhatsapp())
                .verified(seller.isVerified())
                .rating(seller.getRating())
                .reviewCount(seller.getReviewCount())
                .price(price)
                .build();
    }

    private InventoryItemDto toInventoryDto(InventoryItem item) {
        return InventoryItemDto.builder()
                .id(item.getId())
                .productId(item.getProduct().getId())
                .productName(item.getProduct().getName())
                .price(item.getPrice())
                .stock(item.getStock())
                .category(item.getProduct().getCategory())
                .imageUrl(item.getProduct().getImageUrl())
                .listed(item.isListed())
                .build();
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private Seller findSeller(String id) {
        return sellerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Seller not found: " + id));
    }

    private Seller findSellerByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return sellerRepository.findByUser(user)
                .orElseThrow(() -> new ResourceNotFoundException("Seller profile not found for this account"));
    }
}
