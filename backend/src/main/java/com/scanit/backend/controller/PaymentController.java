package com.scanit.backend.controller;

import com.scanit.backend.dto.ApiResponse;
import com.scanit.backend.dto.PaymentInitResponse;
import com.scanit.backend.dto.PaymentVerifyResponse;
import com.scanit.backend.entity.User;
import com.scanit.backend.service.PaystackService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaystackService paystackService;

    @PostMapping("/initialize")
    public ResponseEntity<ApiResponse<PaymentInitResponse>> initialize(
            @RequestParam String plan,
            @RequestParam(required = false, defaultValue = "20") double amount,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        PaymentInitResponse resp = paystackService.initializeTransaction(user.getEmail(), plan, amount);
        return ResponseEntity.ok(ApiResponse.success("Payment initialized", resp));
    }

    @GetMapping("/verify")
    public ResponseEntity<ApiResponse<PaymentVerifyResponse>> verify(@RequestParam String reference) {
        PaymentVerifyResponse resp = paystackService.verifyTransaction(reference);
        return ResponseEntity.ok(ApiResponse.success("Payment verified", resp));
    }

    @PostMapping("/webhook")
    public ResponseEntity<ApiResponse<Void>> webhook(@RequestBody String payload) {
        // Paystack sends event notifications here. For now we log them.
        // In production, parse the event and activate premium based on charge.success.
        return ResponseEntity.ok(ApiResponse.success("Webhook received", null));
    }
}
