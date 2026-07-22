package com.scanit.backend.controller;

import com.scanit.backend.dto.ApiResponse;
import com.scanit.backend.dto.ProductDto;
import com.scanit.backend.dto.UserDto;
import com.scanit.backend.dto.request.UpdateProfileRequest;
import com.scanit.backend.exception.BadRequestException;
import com.scanit.backend.exception.ResourceNotFoundException;
import com.scanit.backend.service.NotificationService;
import com.scanit.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final NotificationService notificationService;

    /** Registers this device's Expo push token so the backend can send push notifications. */
    @PostMapping("/push-token")
    public ResponseEntity<ApiResponse<Void>> savePushToken(
            @RequestBody Map<String, String> body,
            Authentication auth
    ) {
        String token = body.get("pushToken");
        if (token == null || token.isBlank()) {
            throw new BadRequestException("pushToken is required");
        }
        notificationService.savePushToken(auth.getName(), token);
        return ResponseEntity.ok(ApiResponse.success("Push token saved", null));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> getProfile(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success(userService.getProfile(auth.getName())));
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> updateProfile(
            @RequestBody UpdateProfileRequest request,
            Authentication auth
    ) {
        return ResponseEntity.ok(ApiResponse.success(userService.updateProfile(auth.getName(), request)));
    }

    @GetMapping("/me/saved-products")
    public ResponseEntity<ApiResponse<List<ProductDto>>> getSavedProducts(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success(userService.getSavedProducts(auth.getName())));
    }

    @PostMapping("/me/saved-products")
    public ResponseEntity<ApiResponse<Void>> saveProduct(
            @RequestBody Map<String, String> body,
            Authentication auth
    ) {
        String productId = body.get("productId");
        if (productId == null || productId.isBlank()) {
            throw new BadRequestException("productId is required");
        }
        userService.saveProduct(auth.getName(), productId);
        return ResponseEntity.ok(ApiResponse.success("Product saved", null));
    }

    @DeleteMapping("/me/saved-products/{productId}")
    public ResponseEntity<ApiResponse<Void>> unsaveProduct(
            @PathVariable String productId,
            Authentication auth
    ) {
        userService.unsaveProduct(auth.getName(), productId);
        return ResponseEntity.ok(ApiResponse.success("Removed from saved", null));
    }
}
