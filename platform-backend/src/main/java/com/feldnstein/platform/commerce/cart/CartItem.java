package com.feldnstein.platform.commerce.cart;

import com.feldnstein.platform.commerce.shared.DomainException;
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

/**
 * Cart line — entity of the Cart aggregate. Only the Cart root mutates it;
 * price/GST are snapshots taken when the line was added.
 */
@Entity
@Table(name = "cart_item")
public class CartItem extends PanacheEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cart_id", nullable = false)
    private Cart cart;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "variant_id", nullable = false)
    private ProductVariant variant;

    @Column(nullable = false)
    private int qty;

    /** Selling price snapshot (ex-GST) at the moment the item was added. */
    @Column(name = "unit_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "gst_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal gstPct = BigDecimal.ZERO;

    protected CartItem() {}

    CartItem(Cart cart, ProductVariant variant, Money unitPrice, GstRate gstRate) {
        this.cart = cart;
        this.variant = variant;
        this.unitPrice = unitPrice.amount();
        this.gstPct = gstRate.percent();
    }

    void changeQty(Quantity qty) {
        if (qty.isZero()) throw new DomainException("quantity must be positive");
        this.qty = qty.value();
    }

    public ProductVariant variant() {
        return variant;
    }

    public int qty() {
        return qty;
    }

    public Money unitPrice() {
        return Money.of(unitPrice);
    }

    public GstRate gstRate() {
        return GstRate.of(gstPct);
    }

    public Money lineTotal() {
        return unitPrice().times(Quantity.of(qty));
    }

    public Money gstAmount() {
        return lineTotal().gstAt(gstRate());
    }
}
