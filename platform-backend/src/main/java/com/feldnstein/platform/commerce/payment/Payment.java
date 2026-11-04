package com.feldnstein.platform.commerce.payment;

import com.feldnstein.platform.commerce.order.CustomerOrder;
import com.feldnstein.platform.commerce.shared.DomainException;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Payment — an attempt to collect an order's grand total. Guards its own
 * transitions: CREATED → PAID → REFUNDED (or FAILED).
 */
@Entity
@Table(name = "payment")
public class Payment extends PanacheEntity {

    public enum Provider { DEMO, RAZORPAY }
    public enum Status { INITIATED, CREATED, PAID, FAILED, REFUNDED }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private CustomerOrder order;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Provider provider;

    /** Gateway-side reference (razorpay payment id, demo txn id). */
    @Column(name = "provider_ref", length = 128)
    private String providerRef;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Status status = Status.INITIATED;

    /** Raw gateway response for audit. */
    @Column(name = "raw_json", length = 4000)
    private String rawJson;

    @Column(name = "initiated_at", nullable = false)
    private Instant initiatedAt = Instant.now();

    @Column(name = "paid_at") private Instant paidAt;
    @Column(name = "refunded_at") private Instant refundedAt;

    protected Payment() {}

    /** Factory: a freshly created payment for an order, via the given provider. */
    public static Payment initiate(CustomerOrder order, Provider provider) {
        Payment p = new Payment();
        p.order = order;
        p.provider = provider;
        p.amount = order.grandTotal().amount();
        p.providerRef = (provider == Provider.DEMO ? "DEMO-" : "RZP-")
                + UUID.randomUUID().toString().substring(0, 12).toUpperCase();
        p.status = Status.CREATED;
        p.rawJson = "{\"mode\":\"" + provider.name().toLowerCase() + "\"}";
        return p;
    }

    public static Payment findByOrder(CustomerOrder order) {
        return find("order", order).firstResult();
    }

    /** Gateway-assigned reference, set after a provider-side order is created. */
    public void assignProviderRef(String ref) {
        this.providerRef = ref;
    }

    public void rawJson(String raw) {
        this.rawJson = raw;
    }

    public void markPaid(Instant at, String raw) {
        if (status != Status.CREATED && status != Status.INITIATED)
            throw new DomainException("payment is already " + status);
        status = Status.PAID;
        paidAt = at;
        rawJson = raw;
    }

    public void markFailed(String raw) {
        if (status != Status.CREATED && status != Status.INITIATED)
            throw new DomainException("payment is already " + status);
        status = Status.FAILED;
        rawJson = raw;
    }

    public void refund(Instant at) {
        if (status != Status.PAID) throw new DomainException("only paid payments can be refunded");
        status = Status.REFUNDED;
        refundedAt = at;
    }

    public CustomerOrder order() { return order; }
    public Provider provider() { return provider; }
    public String providerRef() { return providerRef; }
    public BigDecimal amount() { return amount; }
    public Status status() { return status; }
    public String rawJson() { return rawJson; }
    public Instant paidAt() { return paidAt; }
    public Instant refundedAt() { return refundedAt; }
}
