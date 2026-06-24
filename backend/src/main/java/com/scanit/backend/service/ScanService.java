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
    public ScanResultDto analyzeImage(String userEmail, String imageUri, String imageLabel) {
        User user = findUser(userEmail);

        Product matched = findMatchingProduct(imageLabel, imageUri);
        double confidence = (imageLabel != null && !imageLabel.isBlank()) ? 88.0 : 75.0;

        ScanResult saved = scanResultRepository.save(
                ScanResult.builder()
                        .user(user)
                        .product(matched)
                        .confidence(confidence)
                        .authenticityStatus(matched.getAuthenticity())
                        .imageUri(imageUri)
                        .build()
        );

        user.setScansCount(user.getScansCount() + 1);
        userRepository.save(user);

        log.debug("Scan complete — user={} product={} label='{}' confidence={}",
                userEmail, matched.getName(), imageLabel, confidence);

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

    /**
     * Tries to find the best matching product for a given AI-detected label.
     *
     * Strategy:
     *  1. Split the label into individual words (e.g. "chocolate sauce" → ["chocolate", "sauce"])
     *  2. Search products whose name or brand contains each word
     *  3. Try full label as a single search phrase
     *  4. Fallback: pick a product deterministically based on imageUri hash
     */
    private Product findMatchingProduct(String imageLabel, String imageUri) {
        if (imageLabel != null && !imageLabel.isBlank()) {
            // Try individual words from the AI label
            String[] words = imageLabel.split("[\\s,_\\-]+");
            for (String word : words) {
                if (word.length() > 3) {
                    List<Product> results = productRepository
                            .findByNameContainingIgnoreCaseOrBrandContainingIgnoreCase(word, word);
                    if (!results.isEmpty()) {
                        log.debug("Label word '{}' matched {} products", word, results.size());
                        return results.get(0);
                    }
                }
            }

            // Try the full label as-is
            List<Product> byLabel = productRepository
                    .findByNameContainingIgnoreCaseOrBrandContainingIgnoreCase(imageLabel, imageLabel);
            if (!byLabel.isEmpty()) return byLabel.get(0);
        }

        // Deterministic hash fallback — same URI always returns same product (good for demos)
        List<Product> all = productRepository.findAll();
        if (all.isEmpty()) {
            throw new ResourceNotFoundException("No products in database. Run the app first to seed data.");
        }
        int idx = Math.abs(imageUri.hashCode()) % all.size();
        log.debug("No label match — falling back to hash index {}/{}", idx, all.size());
        return all.get(idx);
    }

    // ── DTO mapping ───────────────────────────────────────────────────────────

    private ScanResultDto toDto(ScanResult r) {
        return ScanResultDto.builder()
                .id(r.getId())
                .product(productService.toDto(r.getProduct()))
                .confidence(r.getConfidence())
                .scannedAt(r.getScannedAt().toString())
                .authenticityStatus(r.getAuthenticityStatus().name().toLowerCase())
                .imageUri(r.getImageUri())
                .build();
    }

    private User findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }
}
