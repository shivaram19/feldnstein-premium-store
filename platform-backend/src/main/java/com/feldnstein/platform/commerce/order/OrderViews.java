package com.feldnstein.platform.commerce.order;

import com.feldnstein.platform.commerce.payment.Payment;
import com.feldnstein.platform.commerce.payment.PaymentService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Read model for orders — builds the JSON views the REST adapters serve.
 * Query-side mapping only; no behaviour.
 */
@ApplicationScoped
public class OrderViews {

    @Inject PaymentService payments;

    /** Full detail view (lines + payment + timeline). */
    public Map<String, Object> detail(CustomerOrder o) {
        Map<String, Object> m = new LinkedHashMap<String, Object>();
        m.put("orderCode", o.orderCode());
        m.put("status", o.status().name());
        m.put("customerName", o.customerName());
        m.put("email", o.email());
        m.put("phone", o.phone());
        m.put("address", o.deliveryAddress().display());
        m.put("subTotal", o.subTotal().amount());
        m.put("gstTotal", o.gstTotal().amount());
        m.put("grandTotal", o.grandTotal().amount());
        m.put("createdAt", o.createdAt().toString());
        m.put("lines", o.lines().stream().map(l -> {
            Map<String, Object> line = new LinkedHashMap<String, Object>();
            line.put("variantId", l.variant().id);
            line.put("sku", l.variant().sku);
            line.put("product", l.variant().product != null ? l.variant().product.name : "");
            line.put("sizeMl", l.variant().sizeMl);
            line.put("qty", l.qty());
            line.put("unitPrice", l.unitPrice().amount());
            line.put("gstPct", l.gstRate().percent());
            line.put("lineTotal", l.lineTotal().amount());
            return line;
        }).toList());
        m.put("payment", payments.view(Payment.findByOrder(o)));
        Map<String, String> timeline = new LinkedHashMap<String, String>();
        timeline.put("PENDING", o.createdAt().toString());
        if (o.paidAt() != null) timeline.put("PAID", o.paidAt().toString());
        if (o.confirmedAt() != null) timeline.put("CONFIRMED", o.confirmedAt().toString());
        if (o.shippedAt() != null) timeline.put("SHIPPED", o.shippedAt().toString());
        if (o.deliveredAt() != null) timeline.put("DELIVERED", o.deliveredAt().toString());
        if (o.cancelledAt() != null) timeline.put("CANCELLED", o.cancelledAt().toString());
        m.put("timeline", timeline);
        if (o.cancelReason() != null) m.put("cancelReason", o.cancelReason());
        return m;
    }

    /** List row view — no lines/payment/timeline, adds the item count. */
    public Map<String, Object> listRow(CustomerOrder o) {
        Map<String, Object> m = detail(o);
        m.remove("lines");
        m.remove("payment");
        m.remove("timeline");
        m.put("itemCount", o.lines().stream().mapToInt(OrderLine::qty).sum());
        return m;
    }
}
