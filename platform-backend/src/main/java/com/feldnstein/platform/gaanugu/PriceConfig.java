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
@Table(name = "price_config")
public class PriceConfig extends PanacheEntity {

    public enum PriceType { MRP, SELLING, COST }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "variant_id", nullable = false)
    public ProductVariant variant;

    @Enumerated(EnumType.STRING)
    @Column(name = "price_type", nullable = false, length = 16)
    public PriceType priceType;

    /** Ex-GST amount. */
    @Column(nullable = false, precision = 12, scale = 2)
    public BigDecimal amount;

    @Column(name = "gst_pct", nullable = false, precision = 5, scale = 2)
    public BigDecimal gstPct = BigDecimal.ZERO;

    @Column(name = "effective_from", nullable = false)
    public LocalDate effectiveFrom;

    @Column(nullable = false)
    public boolean active = true;

    @Column(length = 500)
    public String notes;

    /** Convenience: price including GST. */
    public BigDecimal amountInclGst() {
        return amount.add(amount.multiply(gstPct).divide(BigDecimal.valueOf(100)));
    }
}
