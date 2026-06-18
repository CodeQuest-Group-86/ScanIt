package com.scanit.backend.entity;

import com.scanit.backend.enums.AuthenticityStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "scan_results")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScanResult {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false)
    private double confidence;

    @CreationTimestamp
    private Instant scannedAt;

    @Enumerated(EnumType.STRING)
    private AuthenticityStatus authenticityStatus;

    private String imageUri;
}
