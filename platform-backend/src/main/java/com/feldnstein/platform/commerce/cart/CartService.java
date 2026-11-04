package com.feldnstein.platform.commerce.cart;

import com.feldnstein.platform.commerce.Pricing;
import com.feldnstein.platform.gaanugu.catalog.ProductVariant;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/** Anonymous-cart operations. The storefront identifies carts by an opaque token. */
@ApplicationScoped
public class CartService {

    public static final String TOKEN_HEADER = "X-Cart-Token";

    public Cart resolve(String token) {
        if (token == null || token.isBlank()) return null;
        Cart cart = Cart.findByToken(token.trim());
        if (cart != null && cart.expiresAt.isBefore(Instant.now())) {
            cart.delete();
            return null;
        }
        return cart;
    }

    @Transactional
    public Cart create() {
        Cart cart = new Cart();
        cart.token = UUID.randomUUID().toString();
        cart.expiresAt = Instant.now().plus(24, ChronoUnit.HOURS);
        cart.persist();
        return cart;
    }

    /** Adds or replaces a line. Returns a rejection message, or null on success. */
    @Transactional
    public String setItem(Cart cart, Long variantId, int qty) {
        if (qty < 0) return "quantity must be zero or positive";
        ProductVariant variant = ProductVariant.findById(variantId);
        if (variant == null) return "product variant not found";
        CartItem item = cart.items.stream()
                .filter(i -> i.variant.id.equals(variantId)).findFirst().orElse(null);
        if (qty == 0) {
            if (item != null) cart.items.remove(item);
            return null;
        }
        long sellable = Pricing.sellableUnits(variant);
        int inCart = cart.items.stream()
                .filter(i -> i.variant.id.equals(variantId)).mapToInt(i -> i.qty).sum();
        if (qty > inCart && sellable < qty) {
            return "only " + sellable + " units available for " + variant.sku;
        }
        if (item == null) {
            item = new CartItem();
            item.cart = cart;
            item.variant = variant;
            item.unitPrice = Pricing.unitPrice(variant);
            item.gstPct = Pricing.gstPct(variant);
            cart.items.add(item);
        }
        item.qty = qty;
        return null;
    }

    /** JSON view: lines with availability, subtotal / GST / grand total. */
    public Map<String, Object> view(Cart cart) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("token", cart.token);
        m.put("expiresAt", cart.expiresAt.toString());
        var lines = cart.items.stream().map(i -> {
            Map<String, Object> l = new LinkedHashMap<String, Object>();
            l.put("variantId", i.variant.id);
            l.put("sku", i.variant.sku);
            l.put("product", i.variant.product != null ? i.variant.product.name : "");
            l.put("sizeMl", i.variant.sizeMl);
            l.put("qty", i.qty);
            l.put("unitPrice", i.unitPrice);
            l.put("gstPct", i.gstPct);
            l.put("lineTotal", i.lineTotal());
            l.put("available", Pricing.sellableUnits(i.variant));
            return l;
        }).toList();
        m.put("lines", lines);
        BigDecimal sub = cart.items.stream().map(CartItem::lineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal gst = cart.items.stream().map(CartItem::gstAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        m.put("subTotal", sub);
        m.put("gstTotal", gst);
        m.put("grandTotal", sub.add(gst));
        m.put("itemCount", cart.items.stream().mapToInt(i -> i.qty).sum());
        return m;
    }

    @Transactional
    public void delete(Cart cart) {
        cart.delete();
    }
}
