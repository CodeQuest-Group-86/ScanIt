package com.scanit.backend.entity;

import com.scanit.backend.enums.UserRole;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

@Entity
@Table(name = "users")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role;

    private String avatarUrl;

    @Column(nullable = false)
    @Builder.Default
    private int scansCount = 0;

    /** Scans used in the current free/paid quota period — resets when a new subscription
     *  activates. Distinct from scansCount, which is a lifetime stat shown on the profile. */
    @Column(nullable = false)
    @Builder.Default
    private int quotaScansUsed = 0;

    @Column(nullable = false)
    @Builder.Default
    private int savedCount = 0;

    @Column(nullable = false)
    @Builder.Default
    private double totalSaved = 0.0;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    private String resetPasswordToken;
    private Instant resetPasswordTokenExpiry;

    // ── OTP fields ────────────────────────────────────────────────────────────

    private String otpCode;
    private Instant otpExpiry;
    /** "signup" or "reset-password" */
    private String otpPurpose;
    private String phoneNumber;

    /** Short-lived token issued after successful OTP verification for sign-up. */
    private String signupToken;
    private Instant signupTokenExpiry;

    /** Expo push token — set via POST /users/push-token once the app has notification
     *  permission. Null means the device isn't registered for push. */
    private String pushToken;

    // ── Subscription fields ──────────────────────────────────────────────────

    /** "premium_monthly" or "premium_yearly" — null when never subscribed. */
    private String subscriptionPlan;
    @Builder.Default
    private boolean subscriptionActive = false;
    private Instant subscriptionExpiresAt;
    /** Last Paystack transaction reference that activated the subscription (idempotency guard). */
    private String lastPaymentReference;

    // ── UserDetails contract ──────────────────────────────────────────────────

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired()     { return true; }

    @Override
    public boolean isAccountNonLocked()      { return true; }

    @Override
    public boolean isCredentialsNonExpired() { return true; }

    @Override
    public boolean isEnabled()               { return true; }
}
