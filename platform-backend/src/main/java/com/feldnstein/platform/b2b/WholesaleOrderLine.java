package com.feldnstein.platform.b2b;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;

/**
 * One wholesale order line — seller-specific unit pricing (the client sends it),
 * server-computed totals. The parent aggregate owns the maths.
 */
@Entity
@Table(name = "b2b_order_line")
public class WholesaleOrderLine extends PanacheEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private WholesaleOrder order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "variant_id", nullable = false)
    private com.feldnstein.platform.gaanugu.catalog.ProductVariant variant;

    @Column(nullable = false)
    private int qty;

    @Column(name = "unit_price_paise", nullable = false)
    private long unitPricePaise;

    @Column(name = "gst_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal gstPct;

    @Column(name = "line_total_paise", nullable = false)
    private long lineTotalPaise;

    protected WholesaleOrderLine() {}

    WholesaleOrderLine(WholesaleOrder order, WholesaleOrder.LineDraft draft) {
        this.order = order;
        this.variant = draft.variant();
        this.qty = draft.qty();
        this.unitPricePaise = draft.unitPricePaise();
        this.gstPct = draft.gstPct();
        this.lineTotalPaise = unitPricePaise * qty;
    }

    long gstAmountPaise() {
        return BigDecimal.valueOf(lineTotalPaise).multiply(gstPct)
                .divide(BigDecimal.valueOf(100), 0, java.math.RoundingMode.HALF_UP)
                .longValueExact();
    }

    public WholesaleOrder order() { return order; }
    public com.feldnstein.platform.gaanugu.catalog.ProductVariant variant() { return variant; }
    public int qty() { return qty; }
    public long unitPricePaise() { return unitPricePaise; }
    public BigDecimal gstPct() { return gstPct; }
    public long lineTotalPaise() { return lineTotalPaise; }
}
