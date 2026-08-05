package com.scanit.backend.controller;

import com.scanit.backend.dto.ApiResponse;
import com.scanit.backend.dto.payment.SubscriptionStatusDto;
import com.scanit.backend.dto.payment.VerifyPaymentRequest;
import com.scanit.backend.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    /** Verifies a completed Paystack transaction server-side and activates the subscription. */
    @PostMapping("/verify")
    public ResponseEntity<ApiResponse<SubscriptionStatusDto>> verify(
            @Valid @RequestBody VerifyPaymentRequest request,
            Authentication authentication
    ) {
        SubscriptionStatusDto status = paymentService.verifyAndActivate(authentication.getName(), request);
        return ResponseEntity.ok(ApiResponse.success("Subscription activated", status));
    }

    @GetMapping("/subscription")
    public ResponseEntity<ApiResponse<SubscriptionStatusDto>> subscription(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(paymentService.getStatus(authentication.getName())));
    }

    @PostMapping("/cancel-subscription")
    public ResponseEntity<ApiResponse<Void>> cancel(Authentication authentication) {
        paymentService.cancel(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success("Subscription cancelled", null));
    }

    /**
     * Paystack server-to-server push, backing up the client-triggered /verify call for cases
     * where the app closes before that fires. Unauthenticated by design (Paystack sends no JWT) —
     * trust comes entirely from the HMAC signature, not from Spring Security.
     */
    @PostMapping("/webhook")
    public ResponseEntity<Void> webhook(
            @RequestBody String rawBody,
            @RequestHeader(value = "x-paystack-signature", required = false) String signature
    ) {
        if (!paymentService.verifyWebhookSignature(rawBody, signature)) {
            return ResponseEntity.status(401).build();
        }
        paymentService.handleWebhookEvent(rawBody);
        return ResponseEntity.ok().build();
    }
}
