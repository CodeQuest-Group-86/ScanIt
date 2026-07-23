package com.scanit.backend.service;

import com.scanit.backend.dto.ProductDto;
import com.scanit.backend.dto.RecommendationDto;
import com.scanit.backend.dto.SellerDto;
import com.scanit.backend.dto.request.ReportCounterfeitRequest;
import com.scanit.backend.entity.CounterfeitReport;
import com.scanit.backend.entity.InventoryItem;
import com.scanit.backend.entity.Product;
import com.scanit.backend.entity.Seller;
import com.scanit.backend.entity.User;
import com.scanit.backend.exception.BadRequestException;
import com.scanit.backend.exception.ResourceNotFoundException;
import com.scanit.backend.repository.CounterfeitReportRepository;
import com.scanit.backend.repository.InventoryItemRepository;
import com.scanit.backend.repository.ProductRepository;
import com.scanit.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final CounterfeitReportRepository counterfeitReportRepository;
    private final UserRepository userRepository;

    private static final String[] THUMBNAIL_COLORS =
            {"#F1C40F", "#E74C3C", "#2ECC71", "#3498DB", "#9B59B6", "#E67E22"};

    // ── Queries ───────────────────────────────────────────────────────────────

    public List<ProductDto> searchProducts(String query, String category) {
        List<Product> products;

        if (hasText(query) && hasText(category)) {
            products = productRepository
                    .findByNameContainingIgnoreCaseOrBrandContainingIgnoreCase(query, query)
                    .stream()
                    .filter(p -> p.getCategory().equalsIgnoreCase(category))
                    .collect(Collectors.toList());
        } else if (hasText(query)) {
            products = productRepository
                    .findByNameContainingIgnoreCaseOrBrandContainingIgnoreCase(query, query);
        } else if (hasText(category)) {
            products = productRepository.findByCategoryIgnoreCase(category);
        } else {
            products = productRepository.findAll();
        }

        return products.stream().map(this::toDto).collect(Collectors.toList());
    }

    public ProductDto getProduct(String id) {
        return toDto(findById(id));
    }

    public List<RecommendationDto> getRecommendations(String productId) {
        Product product = findById(productId);
        List<InventoryItem> listings = inventoryItemRepository.findByProductAndListedTrue(product);

        return listings.stream().map(item -> {
            double original = product.getPrice();
            double listed   = item.getPrice();
            int discount    = (int) Math.round(Math.max(0, (original - listed) / original * 100));
            String color    = THUMBNAIL_COLORS[(int) (Math.random() * THUMBNAIL_COLORS.length)];

            return RecommendationDto.builder()
                    .id(item.getId())
                    .product(toDto(product))
                    .seller(sellerToDto(item.getSeller(), listed))
                    .price(listed)
                    .originalPrice(original)
                    .discountPercent(discount)
                    .thumbnailColor(color)
                    .build();
        }).collect(Collectors.toList());
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    public ProductDto toDto(Product product) {
        List<InventoryItem> listings = inventoryItemRepository.findByProductAndListedTrue(product);
        List<SellerDto> sellers = listings.stream()
                .map(item -> sellerToDto(item.getSeller(), item.getPrice()))
                .collect(Collectors.toList());

        return ProductDto.builder()
                .id(product.getId())
                .name(product.getName())
                .brand(product.getBrand())
                .category(product.getCategory())
                .description(product.getDescription())
                .imageUrl(product.getImageUrl())
                .price(product.getPrice())
                .currency(product.getCurrency())
                .origin(product.getOrigin())
                .specs(product.getSpecs())
                .barcode(product.getBarcode())
                .verified(product.isVerified())
                .authenticity(product.getAuthenticity().name().toLowerCase())
                .sellers(sellers)
                .reportCount(counterfeitReportRepository.countByProduct(product))
                .build();
    }

    /** One report per user per product — resubmitting just confirms, doesn't inflate the count. */
    public long reportCounterfeit(String userEmail, String productId, ReportCounterfeitRequest req) {
        Product product = findById(productId);
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userEmail));

        if (counterfeitReportRepository.existsByUserAndProduct(user, product)) {
            throw new BadRequestException("You've already reported this product.");
        }

        counterfeitReportRepository.save(CounterfeitReport.builder()
                .user(user)
                .product(product)
                .sellerName(req.getSellerName())
                .reason(req.getReason())
                .build());

        return counterfeitReportRepository.countByProduct(product);
    }

    public SellerDto sellerToDto(Seller seller, double price) {
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

    // ── Private helpers ───────────────────────────────────────────────────────

    private Product findById(String id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + id));
    }

    private boolean hasText(String s) {
        return s != null && !s.isBlank();
    }
}
