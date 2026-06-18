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

import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ScanService {

    private final ScanResultRepository scanResultRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final ProductService productService;

    private final Random random = new Random();

    // ── Analyze ───────────────────────────────────────────────────────────────

    /**
     * Simulates AI image analysis. In production, swap the random product
     * selection here with a call to a vision model or barcode-lookup service.
     */
    public ScanResultDto analyzeImage(String userEmail, String imageUri) {
        User user = findUser(userEmail);
        List<Product> products = productRepository.findAll();

        if (products.isEmpty()) {
            throw new ResourceNotFoundException("No products available in the database");
        }

        // Simulate 84–99 % confidence
        double confidence = Math.round((84 + random.nextDouble() * 15) * 10.0) / 10.0;

        Product matched = products.get(random.nextInt(products.size()));

        ScanResult result = scanResultRepository.save(
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

        return toDto(result);
    }

    // ── History ───────────────────────────────────────────────────────────────

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
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
