package com.feldnstein.platform.gaanugu.catalog;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * A buyer-submitted product review (ADR-0028). Only approved rows ever reach
 * the storefront — social proof is a trust asset, and unmoderated publishing
 * would contaminate it. Seeded rows are deliberately imperfect (4s and 5s)
 * per the Northwestern/Spiegel finding that the 4.0–4.7 band reads as
 * credible while a wall of 5.0 reads as manufactured.
 */
@Entity
@Table(name = "product_review")
public class ProductReview extends PanacheEntity {

    @Column(name = "product_id", nullable = false)
    public Long productId;

    @Column(name = "author_name", nullable = false, length = 96)
    public String authorName;

    /** 1–5; validated in the service, constrained in the schema. */
    @Column(nullable = false)
    public int rating;

    @Column(nullable = false, length = 160)
    public String title;

    @Column(nullable = false, length = 2000)
    public String body;

    /** False until an admin approves — pending reviews never render publicly. */
    @Column(nullable = false)
    public boolean approved;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt = Instant.now();
}
