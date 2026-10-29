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
import java.time.LocalDate;

@Entity
@Table(name = "production_batch")
public class ProductionBatch extends PanacheEntity {

    /** Lifecycle gate: sales may only sell RELEASED (per Phase-1 spec). */
    public enum BatchStatus {
        PRESSING, SEDIMENTATION, BOTTLING_READY, BOTTLING, QC_PENDING, QC_PASSED, RELEASED
    }

    @Column(name = "batch_code", unique = true, nullable = false, length = 32)
    public String batchCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    public OilProduct product;

    @Column(name = "press_date", nullable = false)
    public LocalDate pressDate;

    @Column(name = "seed_type", nullable = false, length = 64)
    public String seedType;

    @Column(name = "seed_qty_kg", nullable = false, precision = 12, scale = 2)
    public BigDecimal seedQtyKg;

    @Column(name = "seed_cost_total", nullable = false, precision = 14, scale = 2)
    public BigDecimal seedCostTotal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "farmer_id")
    public Supplier farmer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bull_id")
    public Bull bull;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "operator_id")
    public PressOperator operator;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "press_id")
    public Press press;

    @Column(name = "oil_yield_litres", precision = 12, scale = 2)
    public BigDecimal oilYieldLitres;

    @Column(name = "spillage_litres", precision = 12, scale = 2)
    public BigDecimal spillageLitres = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    public BatchStatus status = BatchStatus.PRESSING;

    @Column(name = "handler_wage_cost", precision = 12, scale = 2)
    public BigDecimal handlerWageCost;

    @Column(name = "bull_feed_cost", precision = 12, scale = 2)
    public BigDecimal bullFeedCost;

    @Column(name = "press_maintenance_cost", precision = 12, scale = 2)
    public BigDecimal pressMaintenanceCost;

    @Column(name = "stone_wear_cost", precision = 12, scale = 2)
    public BigDecimal stoneWearCost;

    @Column(name = "shed_cost", precision = 12, scale = 2)
    public BigDecimal shedCost;

    @Column(name = "packaging_cost", precision = 12, scale = 2)
    public BigDecimal packagingCost;

    @Column(name = "weather_notes", length = 500)
    public String weatherNotes;

    @Column(name = "best_before_date")
    public LocalDate bestBeforeDate;

    /** Status as loaded from the DB — used to enforce the forward-only lifecycle gate. */
    @jakarta.persistence.Transient
    private BatchStatus loadedStatus;

    @jakarta.persistence.PostLoad
    void rememberLoadedStatus() {
        this.loadedStatus = this.status;
    }

    /**
     * Phase-1 spec gate: batches advance exactly one lifecycle step, forward only.
     * Without this, an API client could jump PRESSING → RELEASED and skip QC entirely.
     */
    @jakarta.persistence.PreUpdate
    void enforceLifecycleGate() {
        if (loadedStatus == null || loadedStatus == status) return;
        BatchStatus expected = switch (loadedStatus) {
            case PRESSING -> BatchStatus.SEDIMENTATION;
            case SEDIMENTATION -> BatchStatus.BOTTLING_READY;
            case BOTTLING_READY -> BatchStatus.BOTTLING;
            case BOTTLING -> BatchStatus.QC_PENDING;
            case QC_PENDING -> BatchStatus.QC_PASSED;
            case QC_PASSED -> BatchStatus.RELEASED;
            case RELEASED -> null;
        };
        if (status != expected) {
            throw new IllegalStateException("Illegal batch transition " + loadedStatus + " → " + status
                    + (expected != null ? "; next allowed: " + expected : "; batch is already RELEASED"));
        }
    }
}
