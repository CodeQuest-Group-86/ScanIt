package com.scanit.backend.service;

import com.scanit.backend.dto.ProductDto;
import com.scanit.backend.dto.UserDto;
import com.scanit.backend.dto.request.UpdateProfileRequest;
import com.scanit.backend.entity.Product;
import com.scanit.backend.entity.SavedProduct;
import com.scanit.backend.entity.User;
import com.scanit.backend.exception.ResourceNotFoundException;
import com.scanit.backend.repository.ProductRepository;
import com.scanit.backend.repository.SavedProductRepository;
import com.scanit.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final SavedProductRepository savedProductRepository;
    private final ProductRepository productRepository;
    private final ProductService productService;

    // ── Profile ───────────────────────────────────────────────────────────────

    public UserDto getProfile(String userEmail) {
        return toDto(findUser(userEmail));
    }

    public UserDto updateProfile(String userEmail, UpdateProfileRequest request) {
        User user = findUser(userEmail);

        if (request.getName() != null && !request.getName().isBlank()) {
            user.setName(request.getName());
        }
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl());
        }

        return toDto(userRepository.save(user));
    }

    // ── Saved products ────────────────────────────────────────────────────────

    public List<ProductDto> getSavedProducts(String userEmail) {
        User user = findUser(userEmail);
        return savedProductRepository.findByUser(user)
                .stream()
                .map(sp -> productService.toDto(sp.getProduct()))
                .collect(Collectors.toList());
    }

    public void saveProduct(String userEmail, String productId) {
        User user = findUser(userEmail);
        Product product = findProduct(productId);

        if (savedProductRepository.existsByUserAndProduct(user, product)) {
            return; // idempotent
        }

        savedProductRepository.save(
                SavedProduct.builder().user(user).product(product).build()
        );

        user.setSavedCount(user.getSavedCount() + 1);
        userRepository.save(user);
    }

    @Transactional
    public void unsaveProduct(String userEmail, String productId) {
        User user    = findUser(userEmail);
        Product product = findProduct(productId);

        savedProductRepository.deleteByUserAndProduct(user, product);

        if (user.getSavedCount() > 0) {
            user.setSavedCount(user.getSavedCount() - 1);
            userRepository.save(user);
        }
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    public UserDto toDto(User user) {
        return UserDto.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name().toLowerCase())
                .avatarUrl(user.getAvatarUrl())
                .scansCount(user.getScansCount())
                .savedCount(user.getSavedCount())
                .totalSaved(user.getTotalSaved())
                .createdAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null)
                .build();
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private User findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private Product findProduct(String id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + id));
    }
}
