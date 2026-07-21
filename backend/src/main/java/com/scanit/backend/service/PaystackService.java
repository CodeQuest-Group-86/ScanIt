package com.scanit.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.scanit.backend.dto.PaymentInitResponse;
import com.scanit.backend.dto.PaymentVerifyResponse;
import com.scanit.backend.entity.User;
import com.scanit.backend.exception.BadRequestException;
import com.scanit.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaystackService {

    private final UserRepository userRepository;
    private final ObjectMapper mapper = new ObjectMapper();
    private final OkHttpClient http = new OkHttpClient.Builder()
            .callTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
            .build();

    @Value("${paystack.secret-key:}") private String secretKey;
    @Value("${paystack.public-key:}") private String publicKey;

    private static final String PAYSTACK_URL = "https://api.paystack.co/transaction";

    public PaymentInitResponse initializeTransaction(String email, String plan, double amountGhs) {
        if (secretKey == null || secretKey.isBlank()) {
            throw new BadRequestException("Paystack not configured on server");
        }

        double amountKp = Math.round(amountGhs * 100); // Paystack expects kobo/pesewas (smallest unit)
        String reference = "scanit_" + System.currentTimeMillis() + "_" + email.replace("@", "_");

        Map<String, Object> body = new HashMap<>();
        body.put("email", email);
        body.put("amount", amountKp);
        body.put("reference", reference);
        body.put("currency", "GHS");
        body.put("callback_url", "https://scanit.app/payment/callback");

        Map<String, Object> meta = new HashMap<>();
        meta.put("plan", plan);
        body.put("metadata", meta);

        try {
            String json = mapper.writeValueAsString(body);
            Request request = new Request.Builder()
                    .url(PAYSTACK_URL + "/initialize")
                    .addHeader("Authorization", "Bearer " + secretKey)
                    .addHeader("Content-Type", "application/json")
                    .post(RequestBody.create(json, MediaType.get("application/json")))
                    .build();

            try (Response response = http.newCall(request).execute()) {
                String respBody = response.body() != null ? response.body().string() : "";
                if (!response.isSuccessful()) {
                    log.error("Paystack init error {}: {}", response.code(), respBody);
                    throw new BadRequestException("Payment initialization failed: " + response.code());
                }

                JsonNode root = mapper.readTree(respBody);
                boolean status = root.path("status").asBoolean(false);
                if (!status) {
                    String msg = root.path("message").asText("Unknown error");
                    throw new BadRequestException("Paystack error: " + msg);
                }

                JsonNode data = root.path("data");
                String authUrl = data.path("authorization_url").asText(null);
                String accessCode = data.path("access_code").asText(null);
                String ref = data.path("reference").asText(reference);

                if (authUrl == null) {
                    throw new BadRequestException("No payment URL returned from Paystack");
                }

                return new PaymentInitResponse(ref, authUrl, accessCode, publicKey);
            }
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.error("Paystack init exception: {}", e.getMessage());
            throw new BadRequestException("Payment service error: " + e.getMessage());
        }
    }

    public PaymentVerifyResponse verifyTransaction(String reference) {
        if (secretKey == null || secretKey.isBlank()) {
            throw new BadRequestException("Paystack not configured on server");
        }

        try {
            Request request = new Request.Builder()
                    .url(PAYSTACK_URL + "/verify/" + reference)
                    .addHeader("Authorization", "Bearer " + secretKey)
                    .get()
                    .build();

            try (Response response = http.newCall(request).execute()) {
                String respBody = response.body() != null ? response.body().string() : "";
                if (!response.isSuccessful()) {
                    log.error("Paystack verify error {}: {}", response.code(), respBody);
                    throw new BadRequestException("Payment verification failed: " + response.code());
                }

                JsonNode root = mapper.readTree(respBody);
                boolean status = root.path("status").asBoolean(false);
                if (!status) {
                    throw new BadRequestException("Payment verification failed");
                }

                JsonNode data = root.path("data");
                String txRef = data.path("reference").asText("");
                String statusVal = data.path("status").asText("");
                double amount = data.path("amount").asDouble(0) / 100.0;
                String currency = data.path("currency").asText("GHS");
                String paidAt = data.path("paid_at").asText("");
                String channel = data.path("channel").asText("");

                boolean success = "success".equalsIgnoreCase(statusVal);

                return new PaymentVerifyResponse(txRef, statusVal, success, amount, currency, paidAt, channel);
            }
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.error("Paystack verify exception: {}", e.getMessage());
            throw new BadRequestException("Payment verification error: " + e.getMessage());
        }
    }

    public void activatePremium(String email, String plan) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("User not found"));

        user.setPremium(true);
        user.setSubscriptionPlan(plan);

        Instant now = Instant.now();
        if ("yearly".equalsIgnoreCase(plan)) {
            user.setSubscriptionExpiry(now.plusSeconds(365L * 24 * 60 * 60));
        } else {
            user.setSubscriptionExpiry(now.plusSeconds(30L * 24 * 60 * 60));
        }

        userRepository.save(user);
        log.info("Premium activated for user={} plan={}", email, plan);
    }

    public String getPublicKey() {
        return publicKey != null && !publicKey.isBlank() ? publicKey : "";
    }
}
