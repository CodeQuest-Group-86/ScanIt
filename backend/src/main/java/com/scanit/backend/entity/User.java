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
