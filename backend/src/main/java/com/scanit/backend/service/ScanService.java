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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ScanService {

    private final ScanResultRepository scanResultRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final ProductService productService;

    // ── Analyze ───────────────────────────────────────────────────────────────

    /**
     * Matches a product from the database to the scanned image.
     *
     * Currently uses a hash of the imageUri to deterministically pick a product —
     * same image always returns the same product, no random flicker.
     *
     * Production upgrade path:
     *   1. Set GOOGLE_VISION_KEY in env
     *   2. Call Vision API here to get product labels
     *   3. Use labels to query productRepository.findByNameContaining(label)
     *   4. Return the best match
     */
    @Transactional
    public ScanResultDto analyzeImage(String userEmail, String imageUri) {
        User user = findUser(userEmail);
        List<Product> products = productRepository.findAll();

        if (products.isEmpty()) {
            throw new ResourceNotFoundException("No products in database. Run the data seeder.");
        }

        // Deterministic product selection: same URI → same product every time
        int idx = Math.abs(imageUri.hashCode()) % products.size();
        Product matched = products.get(idx);

        // Confidence based on URI hash — stable, not random
        double confidence = 80 + (Math.abs(imageUri.hashCode() * 31) % 19);

        ScanResult saved = scanResultRepository.save(
                ScanResult.builder()
                        .user(user)
                        .product(matched)
                        .confidence(confidence)
                        .authenticityStatus(matched.getAuthenticity())
                        .imageUri(imageUri)
                        .build()
        );

        // Increment scan counter
        user.setScansCount(user.getScansCount() + 1);
        userRepository.save(user);

        return toDto(saved);
    }

    // ── History ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ScanResultDto> getScanHistory(String userEmail) {
        User user = findUser(userEmail);
        return scanResultRepository.findByUserOrderByScannedAtDesc(user)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

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
