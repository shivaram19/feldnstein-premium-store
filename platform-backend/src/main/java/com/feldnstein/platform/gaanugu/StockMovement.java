package com.feldnstein.platform.gaanugu;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity(name = "GaanuguStockMovement")
@Table(name = "stock_movement")
public class StockMovement extends PanacheEntity {

    public enum MovementType {
        PRODUCTION_IN, PROCUREMENT_IN, TRANSFER_OUT, TRANSFER_IN, ORDER_OUT, ADJUSTMENT_OUT, ADJUSTMENT_IN
    }

    @Column(name = "movement_no", unique = true, nullable = false, length = 32)
    public String movementNo;

    @Column(name = "moved_at", nullable = false)
    public Instant movedAt = Instant.now();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    public MovementType type;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "variant_id", nullable = false)
    public ProductVariant variant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id")
    public ProductionBatch batch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_warehouse_id")
    public Warehouse fromWarehouse;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_warehouse_id")
    public Warehouse toWarehouse;

    @Column(nullable = false)
    public int quantity;

    @Column(name = "unit_cost", precision = 12, scale = 2)
    public BigDecimal unitCost;

    @Column(name = "reference_type", length = 32)
    public String referenceType;

    @Column(name = "reference_id", length = 64)
    public String referenceId;

    @Column(length = 500)
    public String reason;

    @Column(name = "performed_by", length = 128)
    public String performedBy;
}
