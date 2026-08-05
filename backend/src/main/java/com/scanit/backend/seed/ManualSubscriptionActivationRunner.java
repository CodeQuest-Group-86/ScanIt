package com.scanit.backend.seed;

import com.scanit.backend.entity.User;
import com.scanit.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

/**
 * User paid GHS 15 (Premium Monthly) via real MTN MoMo (Transaction ID 86741441272) while the
 * app was still using stale live Paystack keys, so the backend's /payments/verify call rejected
 * it (test secret key can't verify a live-mode transaction) and the subscription never activated
 * — even though the money genuinely left their account. This grants what they already paid for
 * while the Paystack-side fund recovery is handled separately. Guarded by lastPaymentReference
 * so it can only ever apply once, and is a no-op on every later redeploy after that.
 */
@Component
@Order(2)
@RequiredArgsConstructor
@Slf4j
public class ManualSubscriptionActivationRunner implements CommandLineRunner {

    private final UserRepository userRepository;

    private static final String USER_EMAIL = "karldjansi123@gmail.com";
    private static final String MOMO_REFERENCE = "MOMO_86741441272";

    @Override
    public void run(String... args) {
        try {
            User user = userRepository.findByEmail(USER_EMAIL).orElse(null);
            if (user == null) {
                log.warn("Manual subscription activation skipped — no user with email {}", USER_EMAIL);
                return;
            }
            if (MOMO_REFERENCE.equals(user.getLastPaymentReference())) {
                return; // already applied
            }

            user.setSubscriptionActive(true);
            user.setSubscriptionPlan("premium_monthly");
            user.setSubscriptionExpiresAt(Instant.now().plus(30, ChronoUnit.DAYS));
            user.setLastPaymentReference(MOMO_REFERENCE);
            user.setQuotaScansUsed(0);
            userRepository.save(user);

            log.info("Manually activated premium_monthly for {} (real MoMo payment {} outside Paystack verify)",
                    USER_EMAIL, MOMO_REFERENCE);
        } catch (Exception e) {
            log.warn("Manual subscription activation failed (non-fatal): {}", e.getMessage());
        }
    }
}
