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

@Entity
@Table(name = "product_variant")
public class ProductVariant extends PanacheEntity {

    public enum BottleType { GLASS, PET }
    public enum CapType { ROPP, LUG, FLIP_TOP }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    public OilProduct product;

    @Column(unique = true, nullable = false, length = 64)
    public String sku;

    @Column(name = "size_ml", nullable = false)
    public int sizeMl;

    @Enumerated(EnumType.STRING)
    @Column(name = "bottle_type", nullable = false, length = 32)
    public BottleType bottleType;

    @Enumerated(EnumType.STRING)
    @Column(name = "cap_type", nullable = false, length = 32)
    public CapType capType;

    @Column(length = 32)
    public String barcode;

    @Column(precision = 12, scale = 2)
    public BigDecimal mrp;
}
