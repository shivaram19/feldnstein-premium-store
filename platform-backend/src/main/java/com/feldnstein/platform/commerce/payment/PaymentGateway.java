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

    /** Create a payment record/attempt for an order (and, for real gateways, the provider-side order). */
    Payment initiate(CustomerOrder order);

    /** Everything the storefront needs to open the provider's checkout for this payment. */
    CheckoutParams checkoutParams(CustomerOrder order, Payment payment);

    /** Capture an initiated payment (idempotent for already-captured). Demo-only stand-in for a webhook. */
    Payment capture(Payment payment);

    /**
     * Verify a provider checkout callback and mark the payment paid.
     * Throws {@link com.feldnstein.platform.commerce.shared.DomainException} on bad signatures.
     */
    Payment verifyAndCapture(Payment payment, String paymentId, String signature);

    /** Refund a captured payment. */
    Payment refund(Payment payment);

    /** Human-facing note shown at checkout (e.g. demo disclaimer). */
    String checkoutNote();

    /** Client-side checkout parameters. */
    record CheckoutParams(String provider, String keyId, String providerOrderId, long amountPaise,
                          String currency, String orderCode, long orderAmountPaise, String note) {}
}
