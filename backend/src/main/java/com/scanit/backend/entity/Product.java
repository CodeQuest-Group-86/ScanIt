package com.scanit.backend.entity;

import com.scanit.backend.enums.AuthenticityStatus;
import com.scanit.backend.util.MapToJsonConverter;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Entity
@Table(name = "products")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String brand;

    @Column(nullable = false)
    private String category;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String imageUrl;

    @Column(nullable = false)
    private double price;

    @Builder.Default
    private String currency = "GHS";

    private String origin;

    /** Dynamic key-value specs stored as JSON (e.g. Volume → 500ml, pH → 3.8) */
    @Column(columnDefinition = "TEXT")
    @Convert(converter = MapToJsonConverter.class)
    @Builder.Default
    private Map<String, String> specs = new HashMap<>();

    private String barcode;

    @Builder.Default
    private boolean verified = false;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private AuthenticityStatus authenticity = AuthenticityStatus.AUTHENTIC;

    @CreationTimestamp
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;
}
