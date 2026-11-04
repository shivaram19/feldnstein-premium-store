package com.feldnstein.platform.commerce.cart;

import com.feldnstein.platform.commerce.shared.CartTotals;
import com.feldnstein.platform.commerce.shared.DomainException;
import com.feldnstein.platform.commerce.shared.GstRate;
import com.feldnstein.platform.commerce.shared.Money;
import com.feldnstein.platform.commerce.shared.Quantity;
import com.feldnstein.platform.gaanugu.catalog.ProductVariant;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

/**
 * Cart aggregate root — a visitor's selection, identified by an opaque token,
 * expiring after 24 hours. Owns its lines; everything outside talks to this root.
 */
@Entity
@Table(name = "cart")
public class Cart extends PanacheEntity {

    /** Anonymous session token sent by the storefront as the X-Cart-Token header. */
    @Column(nullable = false, unique = true, length = 64)
    private String token;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @OneToMany(mappedBy = "cart", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<CartItem> items = new ArrayList<>();

    protected Cart() {}

    /** Factory: a fresh cart with a random token and 24h to live. */
    public static Cart open() {
        Cart cart = new Cart();
        cart.token = UUID.randomUUID().toString();
        cart.expiresAt = Instant.now().plus(24, ChronoUnit.HOURS);
        return cart;
    }

    public static Cart findByToken(String token) {
        return find("token", token).firstResult();
    }

    public String token() {
        return token;
    }

    public Instant expiresAt() {
        return expiresAt;
    }

    public boolean expired(Instant now) {
        return expiresAt.isBefore(now);
    }

    /** Adds or replaces the line for a variant. Merging equal variants is the invariant here. */
    public CartItem addLine(ProductVariant variant, Quantity qty, Money unitPrice, GstRate gstRate) {
        if (variant == null) throw new DomainException("product variant not found");
        CartItem item = findLine(variant.id);
        if (item == null) {
            if (qty.isZero()) throw new DomainException("quantity must be positive");
            item = new CartItem(this, variant, unitPrice, gstRate);
            items.add(item);
        }
        item.changeQty(qty);
        return item;
    }

    /** Zero quantity removes the line. */
    public void changeQuantity(Long variantId, Quantity qty) {
        CartItem item = findLine(variantId);
        if (item == null) throw new DomainException("item not in cart");
        if (qty.isZero()) items.remove(item);
        else item.changeQty(qty);
    }

    public List<CartItem> lines() {
        return Collections.unmodifiableList(items);
    }

    public boolean isEmpty() {
        return items.isEmpty();
    }

    public void clear() {
        items.clear();
    }

    public CartTotals totals() {
        Money sub = Money.ZERO;
        Money gst = Money.ZERO;
        int count = 0;
        for (CartItem item : items) {
            sub = sub.plus(item.lineTotal());
            gst = gst.plus(item.gstAmount());
            count += item.qty();
        }
        return new CartTotals(sub, gst, sub.plus(gst), count);
    }

    private CartItem findLine(Long variantId) {
        return items.stream().filter(i -> i.variant().id.equals(variantId)).findFirst().orElse(null);
    }
}
