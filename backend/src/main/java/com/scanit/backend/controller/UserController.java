package com.scanit.backend.controller;

import com.scanit.backend.dto.ApiResponse;
import com.scanit.backend.dto.ProductDto;
import com.scanit.backend.dto.UserDto;
import com.scanit.backend.dto.request.UpdateProfileRequest;
import com.scanit.backend.exception.BadRequestException;
import com.scanit.backend.exception.ResourceNotFoundException;
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
