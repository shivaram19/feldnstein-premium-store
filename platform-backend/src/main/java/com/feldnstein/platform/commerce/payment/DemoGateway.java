package com.feldnstein.platform.commerce.payment;

import com.feldnstein.platform.commerce.order.CustomerOrder;
import jakarta.enterprise.context.ApplicationScoped;
import java.time.Instant;

/**
 * Demo gateway — stands in for a real payment provider: captures succeed
 * instantly and refunds are immediate. Selected when no Razorpay keys are
 * configured (payment.provider=demo, the default).
 */
@ApplicationScoped
public class DemoGateway implements PaymentGateway {

    @Override
    public Payment.Provider provider() {
        return Payment.Provider.DEMO;
    }

    @Override
    public Payment initiate(CustomerOrder order) {
        Payment p = Payment.initiate(order, Payment.Provider.DEMO);
        p.persist();
        return p;
    }

    @Override
    public CheckoutParams checkoutParams(CustomerOrder order, Payment payment) {
        return new CheckoutParams("DEMO", "", payment.providerRef(),
                payment.amount().movePointRight(2).longValueExact(), "INR",
                order.orderCode(), order.grandTotal().amount().movePointRight(2).longValueExact(),
                checkoutNote());
    }

    @Override
    public Payment capture(Payment payment) {
        if (payment.status() == Payment.Status.PAID) return payment;
        payment.markPaid(Instant.now(),
                "{\"mode\":\"demo\",\"captured\":true,\"ref\":\"" + payment.providerRef() + "\"}");
        return payment;
    }

    @Override
    public Payment verifyAndCapture(Payment payment, String paymentId, String signature) {
        // demo "verification" — the demo-pay endpoint is the real capture path
        return capture(payment);
    }

    @Override
    public Payment refund(Payment payment) {
        payment.refund(Instant.now());
        return payment;
    }

    @Override
    public String checkoutNote() {
        return "Demo gateway — no real money moves. Razorpay goes live with one config change.";
    }
}
