package com.feldnstein.platform.commerce.payment;

import com.feldnstein.platform.commerce.order.CustomerOrder;
import com.feldnstein.platform.commerce.shared.DomainException;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Instance;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.util.Map;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Payment application service — selects the gateway adapter by configuration
 * (payment.provider=demo default; razorpay when keys are configured) and
 * orchestrates capture/refund. The payment aggregate guards its own transitions.
 */
@ApplicationScoped
public class PaymentService {

    @ConfigProperty(name = "payment.provider", defaultValue = "demo")
    String provider;

    @Inject Instance<PaymentGateway> gateways;

    private PaymentGateway gateway() {
        String want = "razorpay".equalsIgnoreCase(provider)
                ? Payment.Provider.RAZORPAY.name() : Payment.Provider.DEMO.name();
        return gateways.stream()
                .filter(g -> g.provider().name().equalsIgnoreCase(want))
                .findFirst()
                .orElseThrow(() -> new DomainException("no payment gateway adapter for provider " + provider));
    }

    public boolean demoMode() {
        return gateway().provider() == Payment.Provider.DEMO;
    }

    @Transactional
    public Payment initiate(CustomerOrder order) {
        return gateway().initiate(order);
    }

    /** Demo capture — the stand-in for a gateway webhook confirmation. */
    @Transactional
    public Payment demoCapture(CustomerOrder order) {
        Payment p = Payment.findByOrder(order);
        if (p == null) p = initiate(order);
        if (p.status() != Payment.Status.CREATED && p.status() != Payment.Status.INITIATED)
            return p;
        gateway().capture(p);
        if (order.status() == CustomerOrder.Status.PENDING)
            order.markPaid(p.paidAt());
        return p;
    }

    @Transactional
    public Payment refund(CustomerOrder order) {
        Payment p = Payment.findByOrder(order);
        if (p == null || p.status() != Payment.Status.PAID) return p;
        gateway().refund(p);
        return p;
    }

    public Map<String, Object> view(Payment p) {
        if (p == null) return null;
        return Map.of(
                "provider", p.provider().name(),
                "providerRef", p.providerRef() == null ? "" : p.providerRef(),
                "amount", p.amount(),
                "status", p.status().name(),
                "paidAt", p.paidAt() == null ? "" : p.paidAt().toString(),
                "refundedAt", p.refundedAt() == null ? "" : p.refundedAt().toString());
    }
}
