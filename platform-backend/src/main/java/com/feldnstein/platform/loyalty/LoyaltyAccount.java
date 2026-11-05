package com.feldnstein.platform.loyalty;

import com.feldnstein.platform.commerce.shared.DomainException;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

/**
 * Loyalty account — one per customer email, opened lazily on first earn.
 * The balance only ever moves through the append-only {@link LoyaltyTransaction}
 * ledger; the account owns the arithmetic, the services own the orchestration.
 */
@Entity(name = "PlatformLoyaltyAccount")
@Table(name = "loyalty_account")
public class LoyaltyAccount extends PanacheEntity {

    @Column(nullable = false, unique = true, length = 128)
    private String email;

    @Column(name = "points_balance", nullable = false)
    private int pointsBalance = 0;

    @Column(name = "lifetime_earned", nullable = false)
    private int lifetimeEarned = 0;

    @Column(name = "lifetime_redeemed", nullable = false)
    private int lifetimeRedeemed = 0;

    @Version
    private Long version;

    protected LoyaltyAccount() {}

    /** Factory: opens a fresh zero-balance account for the email. */
    public static LoyaltyAccount open(String email) {
        if (email == null || email.isBlank()) throw new DomainException("email is required");
        LoyaltyAccount account = new LoyaltyAccount();
        account.email = email.trim().toLowerCase();
        return account;
    }

    public static LoyaltyAccount findByEmail(String email) {
        if (email == null) return null;
        return find("lower(email) = ?1", email.trim().toLowerCase()).firstResult();
    }

    /** Credits earned points and writes the EARN ledger row. */
    public LoyaltyTransaction earn(int points, Long orderId, String reason) {
        if (points <= 0) throw new DomainException("points to earn must be positive");
        pointsBalance += points;
        lifetimeEarned += points;
        LoyaltyTransaction tx = LoyaltyTransaction.record(this, orderId, LoyaltyTransaction.Type.EARN, points, pointsBalance, reason);
        tx.persist();
        return tx;
    }

    /** Debits redemption points; may never exceed the balance. Writes the REDEEM ledger row. */
    public LoyaltyTransaction redeem(int points, Long orderId, String reason) {
        if (points <= 0) throw new DomainException("points to redeem must be positive");
        if (points > pointsBalance)
            throw new DomainException("only " + pointsBalance + " points available");
        pointsBalance -= points;
        lifetimeRedeemed += points;
        LoyaltyTransaction tx = LoyaltyTransaction.record(this, orderId, LoyaltyTransaction.Type.REDEEM, points, pointsBalance, reason);
        tx.persist();
        return tx;
    }

    /** Manual admin correction (signed); the only operation allowed to clamp the balance at zero. */
    public LoyaltyTransaction adjust(int points, String reason) {
        if (points == 0) throw new DomainException("adjustment points must be non-zero");
        if (reason == null || reason.isBlank()) throw new DomainException("a reason is required");
        pointsBalance = Math.max(0, pointsBalance + points);
        LoyaltyTransaction tx = LoyaltyTransaction.record(this, null, LoyaltyTransaction.Type.ADJUST, points, pointsBalance, reason.trim());
        tx.persist();
        return tx;
    }

    public String email() { return email; }
    public int pointsBalance() { return pointsBalance; }
    public int lifetimeEarned() { return lifetimeEarned; }
    public int lifetimeRedeemed() { return lifetimeRedeemed; }
    public Long version() { return version; }
}
