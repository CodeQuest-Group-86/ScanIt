package com.scanit.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.scanit.backend.dto.payment.SubscriptionStatusDto;
import com.scanit.backend.dto.payment.VerifyPaymentRequest;
import com.scanit.backend.entity.User;
import com.scanit.backend.exception.BadRequestException;
import com.scanit.backend.exception.ResourceNotFoundException;
import com.scanit.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Verifies Paystack transactions server-side (the secret key never leaves the backend)
 * and activates the corresponding subscription. The mobile app only ever sees the
 * Paystack *public* key and a transaction reference — never the secret key.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final UserRepository userRepository;

    @Value("${paystack.secret-key:}") private String paystackSecretKey;

    private static final String VERIFY_URL = "https://api.paystack.co/transaction/verify/";

    /** Amounts are in pesewas (GHS × 100) — must match services/payment.ts PAYSTACK_PLANS on the client. */
    private static final Map<String, PlanSpec> PLANS = Map.of(
        "premium_monthly", new PlanSpec(1500, 30),
        "premium_yearly", new PlanSpec(15000, 365)
    );

    private record PlanSpec(int amountPesewas, int durationDays) {}

    private final OkHttpClient http = new OkHttpClient.Builder()
            .callTimeout(30, TimeUnit.SECONDS).build();
    private final ObjectMapper mapper = new ObjectMapper();

    @Transactional
    public SubscriptionStatusDto verifyAndActivate(String userEmail, VerifyPaymentRequest req) {
        if (paystackSecretKey.isBlank()) {
            throw new BadRequestException("Payments are not configured on the server. Set PAYSTACK_SECRET_KEY.");
        }

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userEmail));

        PlanSpec plan = PLANS.get(req.getPlanId());
        if (plan == null) {
            throw new BadRequestException("Unknown plan: " + req.getPlanId());
        }

        // Idempotency — a reference that already activated this user's subscription is a no-op.
        if (req.getReference().equals(user.getLastPaymentReference())) {
            return toDto(user);
        }

        JsonNode data = callPaystackVerify(req.getReference());

        String status = data.path("status").asText("");
        if (!"success".equals(status)) {
            throw new BadRequestException("Payment was not successful (status: " + status + ")");
        }

        int amount = data.path("amount").asInt(0);
        if (amount != plan.amountPesewas()) {
            log.warn("Payment amount mismatch for {} — expected {} got {} (reference={})",
                    userEmail, plan.amountPesewas(), amount, req.getReference());
            throw new BadRequestException("Payment amount does not match the selected plan.");
        }

        String currency = data.path("currency").asText("");
        if (!currency.isBlank() && !"GHS".equalsIgnoreCase(currency)) {
            throw new BadRequestException("Unexpected payment currency: " + currency);
        }

        String payerEmail = data.path("customer").path("email").asText("");
        if (!payerEmail.isBlank() && !payerEmail.equalsIgnoreCase(userEmail)) {
            log.warn("Payment email mismatch — authenticated={} paystack={} reference={}",
                    userEmail, payerEmail, req.getReference());
            throw new BadRequestException("This payment was not made by the signed-in account.");
        }

        user.setSubscriptionActive(true);
        user.setSubscriptionPlan(req.getPlanId());
        user.setSubscriptionExpiresAt(Instant.now().plus(plan.durationDays(), ChronoUnit.DAYS));
        user.setLastPaymentReference(req.getReference());
        user.setQuotaScansUsed(0);
        userRepository.save(user);

        log.info("Subscription activated for {} — plan={} reference={}", userEmail, req.getPlanId(), req.getReference());
        return toDto(user);
    }

    @Transactional(readOnly = true)
    public SubscriptionStatusDto getStatus(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userEmail));
        expireIfNeeded(user);
        return toDto(user);
    }

    @Transactional
    public void cancel(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userEmail));
        user.setSubscriptionActive(false);
        userRepository.save(user);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void expireIfNeeded(User user) {
        if (user.isSubscriptionActive() && user.getSubscriptionExpiresAt() != null
                && Instant.now().isAfter(user.getSubscriptionExpiresAt())) {
            user.setSubscriptionActive(false);
            userRepository.save(user);
        }
    }

    private JsonNode callPaystackVerify(String reference) {
        Request request = new Request.Builder()
                .url(VERIFY_URL + reference)
                .header("Authorization", "Bearer " + paystackSecretKey)
                .get()
                .build();

        try (Response resp = http.newCall(request).execute()) {
            String body = resp.body() != null ? resp.body().string() : "";
            if (!resp.isSuccessful()) {
                log.error("Paystack verify error {}: {}", resp.code(), body);
                throw new BadRequestException("Could not verify payment with Paystack.");
            }
            JsonNode root = mapper.readTree(body);
            if (!root.path("status").asBoolean(false)) {
                throw new BadRequestException(root.path("message").asText("Payment verification failed"));
            }
            return root.path("data");
        } catch (java.io.IOException e) {
            log.error("Paystack verify network error: {}", e.getMessage());
            throw new BadRequestException("Could not reach Paystack to verify payment. Try again.");
        }
    }

    private SubscriptionStatusDto toDto(User user) {
        return SubscriptionStatusDto.builder()
                .isActive(user.isSubscriptionActive())
                .plan(user.getSubscriptionPlan())
                .expiresAt(user.getSubscriptionExpiresAt() != null ? user.getSubscriptionExpiresAt().toString() : null)
                .build();
    }
}
