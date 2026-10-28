package com.feldnstein.platform.gaanugu;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;

@Entity
@Table(name = "bottling_run")
public class BottlingRun extends PanacheEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id", nullable = false)
    public ProductionBatch batch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "variant_id", nullable = false)
    public ProductVariant variant;

    @Column(name = "bottling_date", nullable = false)
    public LocalDate bottlingDate;

    @Column(name = "bottles_filled", nullable = false)
    public int bottlesFilled;

    @Column(name = "bottles_damaged", nullable = false)
    public int bottlesDamaged;

    @Column(name = "bottles_rejected", nullable = false)
    public int bottlesRejected;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id", nullable = false)
    public Warehouse warehouse;

    @Column(name = "bin_location", length = 64)
    public String binLocation;

    @Column(name = "sticker_from", length = 32)
    public String stickerFrom;

    @Column(name = "sticker_to", length = 32)
    public String stickerTo;
}
