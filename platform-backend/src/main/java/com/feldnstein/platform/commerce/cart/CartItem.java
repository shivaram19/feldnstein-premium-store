package com.feldnstein.platform.commerce.cart;

import com.feldnstein.platform.gaanugu.catalog.ProductVariant;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "cart_item")
public class CartItem extends PanacheEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cart_id", nullable = false)
    public Cart cart;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "variant_id", nullable = false)
    public ProductVariant variant;

    @Column(nullable = false)
    public int qty;

    /** Selling price snapshot (ex-GST) at the moment the item was added. */
    @Column(name = "unit_price", nullable = false, precision = 12, scale = 2)
    public BigDecimal unitPrice;

    @Column(name = "gst_pct", nullable = false, precision = 5, scale = 2)
    public BigDecimal gstPct = BigDecimal.ZERO;

    public BigDecimal lineTotal() {
        return unitPrice.multiply(BigDecimal.valueOf(qty));
    }

    public BigDecimal gstAmount() {
        return lineTotal().multiply(gstPct).divide(BigDecimal.valueOf(100));
    }
}
