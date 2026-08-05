package com.scanit.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.scanit.backend.dto.payment.SubscriptionStatusDto;
import com.scanit.backend.dto.payment.VerifyPaymentRequest;
import com.scanit.backend.entity.User;
import com.scanit.backend.enums.NotificationType;
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

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.Locale;
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
    private final NotificationService notificationService;
    private final EmailService emailService;

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

        activate(user, req.getPlanId(), plan, req.getReference());
        log.info("Subscription activated for {} — plan={} reference={}", userEmail, req.getPlanId(), req.getReference());
        return toDto(user);
    }

    private void activate(User user, String planId, PlanSpec plan, String reference) {
        user.setSubscriptionActive(true);
        user.setSubscriptionPlan(planId);
        user.setSubscriptionExpiresAt(Instant.now().plus(plan.durationDays(), ChronoUnit.DAYS));
        user.setLastPaymentReference(reference);
        user.setQuotaScansUsed(0);
        userRepository.save(user);

        notificationService.notify(
                user,
                "Welcome to Premium!",
                "Your " + planId.replace("_", " ") + " subscription is active. Enjoy your scans!",
                NotificationType.SYSTEM
        );

        try {
            emailService.send(
                    user.getEmail(),
                    "Payment received — welcome to ScanIt Premium!",
                    buildPremiumWelcomeEmailHtml(planId, plan, user.getSubscriptionExpiresAt())
            );
        } catch (Exception e) {
            // The payment already succeeded and the subscription is active — a failed
            // receipt email is logged, not allowed to undo or fail the activation.
            log.error("Failed to send premium welcome email to {}: {}", user.getEmail(), e.getMessage());
        }
    }

    // ── Webhook (Paystack → backend push, backs up the client-triggered /verify call) ──────────

    /** HMAC-SHA512 of the raw request body, keyed with the Paystack secret key — see
     *  https://paystack.com/docs/payments/webhooks/#verify-events-are-from-paystack */
    public boolean verifyWebhookSignature(String rawBody, String signatureHeader) {
        if (signatureHeader == null || signatureHeader.isBlank() || paystackSecretKey.isBlank() || rawBody == null) {
            return false;
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(paystackSecretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            String computed = HexFormat.of().formatHex(mac.doFinal(rawBody.getBytes(StandardCharsets.UTF_8)));
            return MessageDigest.isEqual(
                    computed.getBytes(StandardCharsets.UTF_8),
                    signatureHeader.toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8)
            );
        } catch (Exception e) {
            log.error("Webhook signature check failed: {}", e.getMessage());
            return false;
        }
    }

    /** Caller must verify the signature first — this trusts the payload once called. */
    @Transactional
    public void handleWebhookEvent(String rawBody) {
        JsonNode payload;
        try {
            payload = mapper.readTree(rawBody);
        } catch (java.io.IOException e) {
            log.warn("Webhook payload was not valid JSON");
            return;
        }

        if (!"charge.success".equals(payload.path("event").asText(""))) {
            return; // only subscription charges concern us; ignore transfer/refund/etc events
        }

        JsonNode data = payload.path("data");
        if (!"success".equals(data.path("status").asText(""))) return;

        String reference = data.path("reference").asText("");
        String payerEmail = data.path("customer").path("email").asText("");
        if (reference.isBlank() || payerEmail.isBlank()) {
            log.warn("Webhook charge.success missing reference or customer email");
            return;
        }

        User user = userRepository.findByEmail(payerEmail).orElse(null);
        if (user == null) {
            log.warn("Webhook charge.success for unknown email={} reference={}", payerEmail, reference);
            return;
        }

        // Idempotent: the client's own /verify call for this same reference likely already fired.
        if (reference.equals(user.getLastPaymentReference())) return;

        int amount = data.path("amount").asInt(0);
        var planEntry = PLANS.entrySet().stream()
                .filter(e -> e.getValue().amountPesewas() == amount)
                .findFirst()
                .orElse(null);
        if (planEntry == null) {
            log.warn("Webhook charge.success amount {} matches no known plan (reference={})", amount, reference);
            return;
        }

        activate(user, planEntry.getKey(), planEntry.getValue(), reference);
        log.info("Subscription activated via webhook for {} — plan={} reference={}", payerEmail, planEntry.getKey(), reference);
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

    private static final DateTimeFormatter EXPIRY_DATE_FORMAT =
            DateTimeFormatter.ofPattern("MMMM d, yyyy", Locale.ENGLISH).withZone(ZoneOffset.UTC);

    private String buildPremiumWelcomeEmailHtml(String planId, PlanSpec plan, Instant expiresAt) {
        String planName = formatPlanName(planId);
        String amount = String.format(Locale.ENGLISH, "GHS %.2f", plan.amountPesewas() / 100.0);
        String expiryText = expiresAt != null ? EXPIRY_DATE_FORMAT.format(expiresAt) : "—";

        String body =
                "<div style='padding:36px 32px 8px;text-align:center;'>" +
                "<p style='margin:0 0 6px;color:#1E1410;font-size:20px;font-weight:800;'>Payment received!</p>" +
                "<p style='margin:0 0 28px;color:#7A6050;font-size:15px;line-height:22px;'>" +
                "Thanks for upgrading &mdash; your payment of <strong>" + amount + "</strong> was successful and " +
                "<strong>" + planName + "</strong> is now active on your account." +
                "</p>" +
                "<div style='background-color:#FFF8F0;border:2px solid #F0E4D4;border-radius:16px;padding:20px 24px;text-align:left;'>" +
                "<p style='margin:0 0 8px;color:#A89080;font-size:12px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;'>Plan</p>" +
                "<p style='margin:0 0 16px;color:#1E1410;font-size:16px;font-weight:700;'>" + planName + "</p>" +
                "<p style='margin:0 0 8px;color:#A89080;font-size:12px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;'>Active until</p>" +
                "<p style='margin:0;color:#1E1410;font-size:16px;font-weight:700;'>" + expiryText + "</p>" +
                "</div>" +
                "<p style='margin:28px 0 0;color:#A89080;font-size:13px;line-height:20px;'>Unlimited-tier scans, priority AI processing, advanced authenticity detection and every other Premium perk are unlocked right now &mdash; no need to restart the app.</p>" +
                "</div>";
        return emailService.emailShell(body);
    }

    private String formatPlanName(String planId) {
        String[] words = planId.split("_");
        StringBuilder sb = new StringBuilder();
        for (String w : words) {
            if (w.isEmpty()) continue;
            if (sb.length() > 0) sb.append(' ');
            sb.append(Character.toUpperCase(w.charAt(0))).append(w.substring(1));
        }
        return sb.toString();
    }

    private SubscriptionStatusDto toDto(User user) {
        return SubscriptionStatusDto.builder()
                .isActive(user.isSubscriptionActive())
                .plan(user.getSubscriptionPlan())
                .expiresAt(user.getSubscriptionExpiresAt() != null ? user.getSubscriptionExpiresAt().toString() : null)
                .build();
    }
}
