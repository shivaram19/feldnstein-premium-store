package com.feldnstein.platform.commerce.payment;

import com.feldnstein.platform.commerce.order.CustomerOrder;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Payment orchestration. Provider is config-driven: with no Razorpay keys the
 * DEMO gateway is always used (auto-capture, instant refund) so the full
 * purchase funnel works end-to-end in demos and tests.
 */
@ApplicationScoped
public class PaymentService {

    @ConfigProperty(name = "payment.provider", defaultValue = "demo")
    String provider;

    public boolean demoMode() {
        return !"razorpay".equalsIgnoreCase(provider);
    }

    @Transactional
    public Payment initiate(CustomerOrder order) {
        Payment p = new Payment();
        p.order = order;
        p.provider = demoMode() ? Payment.Provider.DEMO : Payment.Provider.RAZORPAY;
        p.amount = order.grandTotal;
        p.providerRef = (demoMode() ? "DEMO-" : "RZP-") + UUID.randomUUID().toString().substring(0, 12).toUpperCase();
        p.status = Payment.Status.CREATED;
        p.rawJson = "{\"mode\":\"" + p.provider.name().toLowerCase() + "\"}";
        p.persist();
        return p;
    }

    /** Demo capture — the stand-in for a gateway callback/webhook confirmation. */
    @Transactional
    public Payment demoCapture(CustomerOrder order) {
        Payment p = Payment.findByOrder(order);
        if (p == null) p = initiate(order);
        if (p.status != Payment.Status.CREATED && p.status != Payment.Status.INITIATED)
            return p;
        p.status = Payment.Status.PAID;
        p.paidAt = Instant.now();
        p.rawJson = "{\"mode\":\"demo\",\"captured\":true,\"ref\":\"" + p.providerRef + "\"}";
        if (order.status == CustomerOrder.Status.PENDING) {
            order.status = CustomerOrder.Status.PAID;
            order.paidAt = Instant.now();
        }
        return p;
    }

    /** Refund a paid payment (demo: instant; razorpay: marks refunded — gateway call is provider work). */
    @Transactional
    public Payment refund(CustomerOrder order) {
        Payment p = Payment.findByOrder(order);
        if (p == null || p.status != Payment.Status.PAID) return p;
        p.status = Payment.Status.REFUNDED;
        p.refundedAt = Instant.now();
        return p;
    }

    public Map<String, Object> view(Payment p) {
        if (p == null) return null;
        return Map.of(
                "provider", p.provider.name(),
                "providerRef", p.providerRef == null ? "" : p.providerRef,
                "amount", p.amount,
                "status", p.status.name(),
                "paidAt", p.paidAt == null ? "" : p.paidAt.toString(),
                "refundedAt", p.refundedAt == null ? "" : p.refundedAt.toString());
    }
}
