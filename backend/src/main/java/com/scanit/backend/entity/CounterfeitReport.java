package com.scanit.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/** A user-submitted "this looked counterfeit to me" flag on a product — the start of a
 *  real, crowdsourced trust signal instead of the fabricated review data elsewhere. */
@Entity
@Table(name = "counterfeit_reports")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CounterfeitReport {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    /** Which seller the user bought/saw it from, if they said. Free text, not a Seller FK,
     *  since dynamically-found sellers (Jumia via search, CompuGhana) aren't persisted rows. */
    private String sellerName;

    @Column(length = 500)
    private String reason;

    @CreationTimestamp
    private Instant timestamp;
}
