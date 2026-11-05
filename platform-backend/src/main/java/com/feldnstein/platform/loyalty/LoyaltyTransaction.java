package com.feldnstein.platform.loyalty;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * Loyalty ledger entry — append-only. Every balance movement (earn, redeem,
 * admin adjust) lands here with the running balance. Orders and loyalty are
 * decoupled: {@code order_id} is a plain value, not a FK; the
 * {@code (order_id, type)} unique pair is the idempotency backstop that makes
 * earn-on-delivery safe to replay.
 */
@Entity(name = "PlatformLoyaltyTransaction")
@Table(name = "loyalty_transaction")
public class LoyaltyTransaction extends PanacheEntity {

    public enum Type { EARN, REDEEM, ADJUST }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private LoyaltyAccount account;

    @Column(name = "order_id")
    private Long orderId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Type type;

    @Column(nullable = false)
    private int points;

    @Column(name = "balance_after", nullable = false)
    private int balanceAfter;

    @Column(length = 255)
    private String reason;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected LoyaltyTransaction() {}

    static LoyaltyTransaction record(LoyaltyAccount account, Long orderId, Type type,
                                     int points, int balanceAfter, String reason) {
        LoyaltyTransaction tx = new LoyaltyTransaction();
        tx.account = account;
        tx.orderId = orderId;
        tx.type = type;
        tx.points = points;
        tx.balanceAfter = balanceAfter;
        tx.reason = reason;
        return tx;
    }

    public static LoyaltyTransaction findByOrderAndType(Long orderId, Type type) {
        if (orderId == null) return null;
        return find("orderId = ?1 and type = ?2", orderId, type).firstResult();
    }

    public LoyaltyAccount account() { return account; }
    public Long orderId() { return orderId; }
    public Type type() { return type; }
    public int points() { return points; }
    public int balanceAfter() { return balanceAfter; }
    public String reason() { return reason; }
    public Instant createdAt() { return createdAt; }
}
