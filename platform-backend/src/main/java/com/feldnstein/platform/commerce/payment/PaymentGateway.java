package com.feldnstein.platform.commerce.payment;

import com.feldnstein.platform.commerce.order.CustomerOrder;

/**
 * Payment gateway port — the anti-corruption layer between our model and a
 * provider (Razorpay, or the built-in demo gateway). Adapters live in this
 * package; the application layer only speaks this interface.
 */
public interface PaymentGateway {

    /** Which provider this adapter serves. */
    Payment.Provider provider();

    /** Create a payment record/attempt for an order. */
    Payment initiate(CustomerOrder order);

    /** Capture an initiated payment (idempotent for already-captured). */
    Payment capture(Payment payment);

    /** Refund a captured payment. */
    Payment refund(Payment payment);

    /** Human-facing note shown at checkout (e.g. demo disclaimer). */
    String checkoutNote();
}
