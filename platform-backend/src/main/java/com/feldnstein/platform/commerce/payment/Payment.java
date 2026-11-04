package com.feldnstein.platform.commerce.payment;

import com.feldnstein.platform.commerce.order.CustomerOrder;
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

@Entity
@Table(name = "payment")
public class Payment extends PanacheEntity {

    public enum Provider { DEMO, RAZORPAY }
    public enum Status { INITIATED, CREATED, PAID, FAILED, REFUNDED }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    public CustomerOrder order;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    public Provider provider;

    /** Gateway-side reference (razorpay payment id, demo txn id). */
    @Column(name = "provider_ref", length = 128)
    public String providerRef;

    @Column(nullable = false, precision = 12, scale = 2)
    public BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    public Status status = Status.INITIATED;

    /** Raw gateway response for audit. */
    @Column(name = "raw_json", length = 4000)
    public String rawJson;

    @Column(name = "initiated_at", nullable = false)
    public Instant initiatedAt = Instant.now();

    @Column(name = "paid_at") public Instant paidAt;
    @Column(name = "refunded_at") public Instant refundedAt;

    public static Payment findByOrder(CustomerOrder order) {
        return find("order", order).firstResult();
    }
}
