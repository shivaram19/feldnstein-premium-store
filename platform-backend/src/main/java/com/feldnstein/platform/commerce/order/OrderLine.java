package com.feldnstein.platform.commerce.order;

import com.feldnstein.platform.commerce.shared.GstRate;
import com.feldnstein.platform.commerce.shared.Money;
import com.feldnstein.platform.commerce.shared.Quantity;
import com.feldnstein.platform.gaanugu.catalog.ProductVariant;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;

/** Order line — entity of the Order aggregate; only the CustomerOrder root creates it. */
@Entity
@Table(name = "order_line")
public class OrderLine extends PanacheEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private CustomerOrder order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "variant_id", nullable = false)
    private ProductVariant variant;

    @Column(nullable = false)
    private int qty;

    @Column(name = "unit_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "gst_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal gstPct = BigDecimal.ZERO;

    @Column(name = "line_total", nullable = false, precision = 12, scale = 2)
    private BigDecimal lineTotal;

    protected OrderLine() {}

    OrderLine(CustomerOrder order, ProductVariant variant, Quantity qty, Money unitPrice, GstRate gstRate) {
        this.order = order;
        this.variant = variant;
        this.qty = qty.value();
        this.unitPrice = unitPrice.amount();
        this.gstPct = gstRate.percent();
        this.lineTotal = unitPrice.times(qty).amount();
    }

    public CustomerOrder order() { return order; }
    public ProductVariant variant() { return variant; }
    public int qty() { return qty; }
    public Money unitPrice() { return Money.of(unitPrice); }
    public GstRate gstRate() { return GstRate.of(gstPct); }
    public Money lineTotal() { return Money.of(lineTotal); }

    public Money gstAmount() {
        return lineTotal().gstAt(gstRate());
    }
}
