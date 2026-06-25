package com.scanit.backend.service;

import com.scanit.backend.dto.ScanResultDto;
import com.scanit.backend.entity.Product;
import com.scanit.backend.entity.ScanResult;
import com.scanit.backend.entity.User;
import com.scanit.backend.exception.ResourceNotFoundException;
import com.scanit.backend.repository.ProductRepository;
import com.scanit.backend.repository.ScanResultRepository;
import com.scanit.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScanService {

    private final ScanResultRepository scanResultRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final ProductService productService;
    private final GeminiService geminiService;

    // ── Analyze image ─────────────────────────────────────────────────────────

    /**
     * Matches a scanned image to a product in the database.
     *
     * The mobile app sends an imageUri plus an optional imageLabel detected
     * by the on-device AI models (HuggingFace Vision, TFLite, MobileNet).
     *
     * Matching strategy (in order):
     *   1. If imageLabel is provided: keyword-search products by label words
     *   2. If category keywords found in label: filter by category
     *   3. Fallback: deterministic hash of imageUri picks a product (consistent demo)
     *
     * Production upgrade: replace step 3 with a call to Google Vision Product
     * Search or a fine-tuned classification model served on HuggingFace/Railway.
     */
    @Transactional
    public ScanResultDto analyzeImage(String userEmail, byte[] imageBytes, String mimeType) {
        User user = findUser(userEmail);

        // Ask Gemini Vision to identify the product
        GeminiService.ProductInfo gemini = geminiService.identifyProduct(imageBytes, mimeType);

        Product matched = findOrCreateProduct(gemini);
        double confidence = gemini != null ? 92.0 : 70.0;

        ScanResult saved = scanResultRepository.save(
                ScanResult.builder()
                        .user(user)
                        .product(matched)
                        .confidence(confidence)
                        .authenticityStatus(matched.getAuthenticity())
                        .imageUri("upload")
                        .build()
        );

        user.setScansCount(user.getScansCount() + 1);
        userRepository.save(user);

        log.debug("Scan complete — user={} product={} confidence={}", userEmail, matched.getName(), confidence);
        return toDto(saved);
    }

    // ── Barcode lookup ────────────────────────────────────────────────────────

    /**
     * Look up a product by its barcode.
     * Barcode scans are 99% accurate — no AI inference needed.
     * The scan is saved to the user's history just like a camera scan.
     */
    @Transactional
    public ScanResultDto findByBarcode(String userEmail, String barcode) {
        User user = findUser(userEmail);

        List<Product> products = productRepository.findByBarcode(barcode);
        if (products.isEmpty()) {
            throw new ResourceNotFoundException(
                    "No product found with barcode: " + barcode +
                    ". Add this product to the database."
            );
        }

        Product product = products.get(0);

        ScanResult saved = scanResultRepository.save(
                ScanResult.builder()
                        .user(user)
                        .product(product)
                        .confidence(99.0)
                        .authenticityStatus(product.getAuthenticity())
                        .imageUri("barcode:" + barcode)
                        .build()
        );

        user.setScansCount(user.getScansCount() + 1);
        userRepository.save(user);

        log.debug("Barcode scan — user={} barcode={} product={}", userEmail, barcode, product.getName());

        return toDto(saved);
    }

    // ── History ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ScanResultDto> getScanHistory(String userEmail) {
        User user = findUser(userEmail);
        return scanResultRepository.findByUserOrderByScannedAtDesc(user)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private Product findOrCreateProduct(GeminiService.ProductInfo gemini) {
        if (gemini == null) {
            throw new com.scanit.backend.exception.InvalidObjectException(
                "Could not identify a product in the image. Try a clearer shot."
            );
        }

        String name = gemini.name();
        String brand = gemini.brand();

        // 1. Try exact name+brand match
        List<Product> exact = productRepository
                .findByNameContainingIgnoreCaseOrBrandContainingIgnoreCase(name, brand);
        if (!exact.isEmpty()) {
            log.debug("Gemini label '{}' matched existing product '{}'", name, exact.get(0).getName());
            return exact.get(0);
        }

        // 2. Try individual words from the product name
        for (String word : name.split("[\\s,_\\-]+")) {
            if (word.length() > 3) {
                List<Product> byWord = productRepository
                        .findByNameContainingIgnoreCaseOrBrandContainingIgnoreCase(word, word);
                if (!byWord.isEmpty()) {
                    log.debug("Word '{}' matched existing product '{}'", word, byWord.get(0).getName());
                    return byWord.get(0);
                }
            }
        }

        // 3. Auto-create with Gemini's description
        log.info("Auto-creating product from Gemini: '{}'", name);
        return productRepository.save(Product.builder()
                .name(name.substring(0, 1).toUpperCase() + name.substring(1))
                .brand(brand)
                .category(gemini.category())
                .description(gemini.description())
                .price(0.0)
                .currency("GHS")
                .origin("Ghana")
                .verified(false)
                .authenticity(com.scanit.backend.enums.AuthenticityStatus.AUTHENTIC)
                .build());
    }

    // ── DTO mapping ───────────────────────────────────────────────────────────

    private ScanResultDto toDto(ScanResult r) {
        return ScanResultDto.builder()
                .id(r.getId())
                .product(productService.toDto(r.getProduct()))
                .confidence(r.getConfidence())
                .scannedAt(r.getScannedAt() != null ? r.getScannedAt().toString() : Instant.now().toString())
                .authenticityStatus(r.getAuthenticityStatus().name().toLowerCase())
                .imageUri(r.getImageUri())
                .build();
    }

    private User findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }
}
