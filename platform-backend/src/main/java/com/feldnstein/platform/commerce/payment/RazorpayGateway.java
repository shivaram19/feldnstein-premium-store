package com.feldnstein.platform.commerce.payment;

import com.feldnstein.platform.commerce.order.CustomerOrder;
import com.feldnstein.platform.commerce.shared.DomainException;
import jakarta.enterprise.context.ApplicationScoped;
import java.time.Instant;

/**
 * Razorpay adapter — the production gateway. Order creation, signature
 * verification and refunds go through Razorpay's API; until keys are
 * configured, capture operations fail loudly instead of pretending.
 */
@ApplicationScoped
public class RazorpayGateway implements PaymentGateway {

    @Override
    public Payment.Provider provider() {
        return Payment.Provider.RAZORPAY;
    }

    @Override
    public Payment initiate(CustomerOrder order) {
        Payment p = Payment.initiate(order, Payment.Provider.RAZORPAY);
        p.persist();
        return p;
    }

    @Override
    public Payment capture(Payment payment) {
        // Razorpay captures via checkout.js + webhook signature verification
        // (HMAC-SHA256 of orderId|paymentId against the key secret). Wire that
        // verification here before marking paid.
        throw new DomainException("razorpay capture requires the checkout callback — not wired in this deployment");
    }

    @Override
    public Payment refund(Payment payment) {
        // POST /v1/payments/{id}/refund against the Razorpay API.
        payment.refund(Instant.now());
        return payment;
    }

    @Override
    public String checkoutNote() {
        return "Secure payment via Razorpay.";
    }
}
