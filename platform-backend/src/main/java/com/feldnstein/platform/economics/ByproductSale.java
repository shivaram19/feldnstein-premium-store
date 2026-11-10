package com.feldnstein.platform.economics;

import com.feldnstein.platform.gaanugu.catalog.OilProduct;
import com.feldnstein.platform.gaanugu.production.ProductionBatch;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "byproduct_sale")
public class ByproductSale extends PanacheEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    public OilProduct product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id")
    public ProductionBatch batch;

    @Column(name = "qty_kg", nullable = false, precision = 10, scale = 2)
    public BigDecimal qtyKg;

    @Column(name = "price_per_kg_paise", nullable = false)
    public long pricePerKgPaise;

    @Column(length = 128)
    public String buyer;

    @Column(name = "sold_at", nullable = false)
    public Instant soldAt;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt = Instant.now();
}
