package com.feldnstein.platform.commerce.payment;

import com.feldnstein.platform.commerce.order.CustomerOrder;
import com.feldnstein.platform.commerce.shared.DomainException;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Instance;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.util.Map;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

/**
 * Payment application service — selects the gateway adapter by configuration
 * and orchestrates checkout params, capture, verification and refund. The
 * payment aggregate guards its own transitions; the gateway adapter is the
 * anti-corruption layer to the provider.
 */
@ApplicationScoped
public class PaymentService {

    private static final Logger LOG = Logger.getLogger(PaymentService.class);

    @ConfigProperty(name = "payment.provider", defaultValue = "demo")
    String provider;

    @Inject Instance<PaymentGateway> gateways;
    @Inject RazorpayGateway razorpay;

    private PaymentGateway gateway() {
        if ("razorpay".equalsIgnoreCase(provider)) {
            if (razorpay.configured()) return razorpay;
            LOG.warn("payment.provider=razorpay but keys are missing — falling back to the demo gateway");
        }
        return gateways.stream()
                .filter(g -> g.provider() == Payment.Provider.DEMO)
                .findFirst()
                .orElseThrow(() -> new DomainException("no payment gateway adapter available"));
    }

    public boolean demoMode() {
        return gateway().provider() == Payment.Provider.DEMO;
    }

    @Transactional
    public Payment initiate(CustomerOrder order) {
        return gateway().initiate(order);
    }

    /** Client-side parameters for opening the provider's checkout on this order. */
    public PaymentGateway.CheckoutParams checkoutParams(CustomerOrder order) {
        Payment p = Payment.findByOrder(order);
        if (p == null) p = initiate(order);
        return gateway().checkoutParams(order, p);
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

    /** Verify a checkout callback (razorpay signature) and mark order + payment paid. */
    @Transactional
    public CustomerOrder verifyPayment(CustomerOrder order, String paymentId, String signature) {
        Payment p = Payment.findByOrder(order);
        if (p == null) throw new DomainException("no payment found for this order");
        if (p.status() == Payment.Status.PAID) return order; // idempotent
        try {
            gateway().verifyAndCapture(p, paymentId, signature);
        } catch (DomainException e) {
            // a concurrent verify already captured this payment — report success, not an error
            if (p.status() == Payment.Status.PAID) return order;
            throw e;
        }
        if (order.status() == CustomerOrder.Status.PENDING)
            order.markPaid(p.paidAt());
        else if (order.status() == CustomerOrder.Status.CANCELLED)
            refund(order); // money captured after cancellation goes straight back
        return order;
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
