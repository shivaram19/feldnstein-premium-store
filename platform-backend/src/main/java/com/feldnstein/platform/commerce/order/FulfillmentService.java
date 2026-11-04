package com.feldnstein.platform.commerce.order;

import com.feldnstein.platform.commerce.fulfillment.StockAllocator;
import com.feldnstein.platform.commerce.payment.Payment;
import com.feldnstein.platform.commerce.payment.PaymentService;
import com.feldnstein.platform.commerce.shared.DomainException;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.Instant;

/**
 * Order fulfilment — the admin use cases. Each method loads the aggregate,
 * asks it to transition (the status machine decides), performs the stock side
 * effect, and lets the transaction commit. No business rules of its own.
 */
@ApplicationScoped
public class FulfillmentService {

    @Inject StockAllocator stock;
    @Inject PaymentService payments;

    public record ActionResult(boolean ok, String message) {}

    @Transactional
    public ActionResult confirm(CustomerOrder order) {
        try {
            order.confirm(Instant.now());
            return ok("confirmed");
        } catch (DomainException e) {
            return new ActionResult(false, e.getMessage());
        }
    }

    @Transactional
    public ActionResult ship(CustomerOrder order) {
        try {
            stock.deduct(order);
            order.ship(Instant.now());
            return ok("shipped");
        } catch (DomainException e) {
            return new ActionResult(false, e.getMessage());
        }
    }

    @Transactional
    public ActionResult deliver(CustomerOrder order) {
        try {
            order.deliver(Instant.now());
            return ok("delivered");
        } catch (DomainException e) {
            return new ActionResult(false, e.getMessage());
        }
    }

    @Transactional
    public ActionResult cancel(CustomerOrder order, String reason) {
        // guard first: no side effects (stock release, refund) for an un-cancellable order
        if (!order.cancellable())
            return new ActionResult(false,
                    "order can no longer be cancelled (status is " + order.status() + ")");
        stock.release(order);
        if (order.status() == CustomerOrder.Status.PAID || order.status() == CustomerOrder.Status.CONFIRMED)
            payments.refund(order);
        order.cancel(Instant.now(), reason);
        return ok("cancelled");
    }

    private static ActionResult ok(String message) {
        return new ActionResult(true, message);
    }
}
