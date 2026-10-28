package com.feldnstein.platform.gaanugu;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "stock_level",
        uniqueConstraints = @UniqueConstraint(columnNames = {"variant_id", "batch_id", "warehouse_id"}))
public class StockLevel extends PanacheEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "variant_id", nullable = false)
    public ProductVariant variant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id")
    public ProductionBatch batch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id", nullable = false)
    public Warehouse warehouse;

    @Column(name = "on_hand", nullable = false)
    public int onHand;

    @Column(nullable = false)
    public int reserved;

    @Column(name = "unit_cost", precision = 12, scale = 2)
    public BigDecimal unitCost;

    @Column(name = "expiry_date")
    public LocalDate expiryDate;

    /** available = on_hand − reserved; derived, never stored. */
    @Transient
    public int getAvailable() {
        return onHand - reserved;
    }
}
