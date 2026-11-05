package com.feldnstein.platform.commerce.cart;

import com.feldnstein.platform.commerce.Pricing;
import com.feldnstein.platform.commerce.fulfillment.StockAllocator;
import com.feldnstein.platform.commerce.shared.CartTotals;
import com.feldnstein.platform.commerce.shared.DomainException;
import com.feldnstein.platform.commerce.shared.Quantity;
import com.feldnstein.platform.gaanugu.catalog.ProductVariant;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Cart session — application service for the anonymous cart. Holds no business
 * rules beyond orchestration: variant existence and oversell checks delegate to
 * the pricing policy and the stock allocator; the Cart aggregate owns its lines.
 */
@ApplicationScoped
public class CartService {

    public static final String TOKEN_HEADER = "X-Cart-Token";

    @Inject StockAllocator stock;
    @Inject Pricing pricing;

    @Transactional
    public Cart resolve(String token) {
        if (token == null || token.isBlank()) return null;
        Cart cart = Cart.findByToken(token.trim());
        if (cart != null && cart.expired(Instant.now())) {
            delete(cart);
            return null;
        }
        return cart;
    }

    @Transactional
    public Cart create() {
        Cart cart = Cart.open();
        cart.persist();
        return cart;
    }

    /** Adds or replaces a line. Returns a rejection message, or null on success. */
    @Transactional
    public String setItem(Cart cart, Long variantId, int qty) {
        if (qty < 0) return "quantity must be zero or positive";
        ProductVariant variant = ProductVariant.findById(variantId);
        if (variant == null) return "product variant not found";
        if (qty > 0) {
            int inCart = cart.lines().stream()
                    .filter(i -> i.variant().id.equals(variantId)).mapToInt(CartItem::qty).sum();
            long sellable = stock.sellableUnits(variant);
            if (qty > inCart && sellable < qty)
                return "only " + sellable + " units available for " + variant.sku;
        }
        try {
            if (qty == 0) cart.changeQuantity(variantId, Quantity.of(0));
            else cart.addLine(variant, Quantity.of(qty), pricing.unitPrice(variant), pricing.gstRate(variant));
            return null;
        } catch (DomainException e) {
            return e.getMessage();
        }
    }

    /** JSON view of the cart for the storefront. */
    public Map<String, Object> view(Cart cart) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("token", cart.token());
        m.put("expiresAt", cart.expiresAt().toString());
        m.put("lines", cart.lines().stream().map(this::lineView).toList());
        CartTotals t = cart.totals();
        m.put("subTotal", t.subTotal().amount());
        m.put("gstTotal", t.gstTotal().amount());
        m.put("grandTotal", t.grandTotal().amount());
        m.put("itemCount", t.itemCount());
        return m;
    }

    private Map<String, Object> lineView(CartItem i) {
        Map<String, Object> l = new LinkedHashMap<String, Object>();
        l.put("variantId", i.variant().id);
        l.put("sku", i.variant().sku);
        l.put("product", i.variant().product != null ? i.variant().product.name : "");
        l.put("sizeMl", i.variant().sizeMl);
        l.put("qty", i.qty());
        l.put("unitPrice", i.unitPrice().amount());
        l.put("gstPct", i.gstRate().percent());
        l.put("lineTotal", i.lineTotal().amount());
        l.put("available", stock.sellableUnits(i.variant()));
        return l;
    }

    @Transactional
    public void delete(Cart cart) {
        cart.delete();
    }
}
