package com.feldnstein.platform.commerce.order;

import com.feldnstein.platform.commerce.cart.Cart;
import com.feldnstein.platform.commerce.cart.CartItem;
import com.feldnstein.platform.commerce.fulfillment.StockAllocator;
import com.feldnstein.platform.commerce.payment.PaymentGateway;
import com.feldnstein.platform.commerce.payment.PaymentService;
import com.feldnstein.platform.commerce.shared.DeliveryAddress;
import com.feldnstein.platform.commerce.shared.DomainException;
import com.feldnstein.platform.commerce.shared.EmailAddress;
import com.feldnstein.platform.commerce.shared.OrderNo;
import com.feldnstein.platform.loyalty.LoyaltyService;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

/**
 * Checkout — the use case that turns a cart into an order: validate the
 * delivery details, price the lines (snapshots already on the cart), place the
 * order aggregate, reserve the stock, start the payment. No rules of its own.
 */
@ApplicationScoped
public class CheckoutService {

    @Inject StockAllocator stock;
    @Inject PaymentService payments;
    @Inject OrderViews views;
    @Inject LoyaltyService loyalty;

    public record CheckoutForm(String customerName, String email, String phone,
                               String address, String city, String state, String pincode,
                               Integer pointsToRedeem) {}

    /** Places the order. Throws {@link DomainException} with a friendly message on rejection. */
    public CustomerOrder place(Cart cart, CheckoutForm form) {
        if (cart == null || cart.isEmpty()) throw new DomainException("cart is empty");
        DeliveryAddress delivery = new DeliveryAddress(
                form.address(), form.city(), form.state(), form.pincode());
        EmailAddress email = new EmailAddress(form.email());

        for (CartItem item : cart.lines()) {
            long sellable = stock.sellableUnits(item.variant());
            if (item.qty() > sellable)
                throw new DomainException("only " + sellable + " units available for " + item.variant().sku);
        }

        List<CustomerOrder.LineDraft> drafts = cart.lines().stream()
                .map(i -> new CustomerOrder.LineDraft(i.variant(),
                        com.feldnstein.platform.commerce.shared.Quantity.of(i.qty()),
                        i.unitPrice(), i.gstRate()))
                .toList();

        CustomerOrder order = CustomerOrder.place(OrderNo.fresh(), form.customerName(),
                email, form.phone(), delivery, drafts);
        order.persist();

        if (form.pointsToRedeem() != null) {
            if (form.pointsToRedeem() < 0) throw new DomainException("pointsToRedeem must be zero or positive");
            if (form.pointsToRedeem() > 0) loyalty.redeemAtCheckout(order, form.pointsToRedeem());
        }

        order.recordAllocations(stock.reserve(order));
        payments.initiate(order);
        cart.clear();
        return order;
    }

    /** Order + payment + checkout view payload for the storefront. */
    public Map<String, Object> receipt(CustomerOrder order) {
        Map<String, Object> out = views.detail(order);
        out.put("demoPayment", payments.demoMode());
        PaymentGateway.CheckoutParams cp = payments.checkoutParams(order);
        out.put("checkout", Map.of(
                "provider", cp.provider(),
                "keyId", cp.keyId(),
                "orderId", cp.providerOrderId(),
                "amountPaise", cp.amountPaise(),
                "currency", cp.currency(),
                "orderCode", cp.orderCode(),
                "note", cp.note()));
        out.put("loyalty", Map.of(
                "earned", loyalty.pointsFor(order.grandTotal()),
                "redeemed", order.pointsRedeemed()));
        return out;
    }
}
