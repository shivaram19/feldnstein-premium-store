package com.feldnstein.platform.loyalty;

import com.feldnstein.platform.commerce.order.CustomerOrder;
import com.feldnstein.platform.commerce.shared.DomainException;
import com.feldnstein.platform.commerce.shared.Money;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Loyalty application service — the use cases around the account aggregate:
 * earn on delivery (idempotent per order), redeem at checkout (1 point = ₹1,
 * post-GST discount capped by the grand total and the balance), and admin
 * adjustment with a mandatory reason. Points arithmetic: {@code round_half_up}
 * of grand-total rupees × {@code loyalty.earn-percent}.
 */
@ApplicationScoped
public class LoyaltyService {

    @ConfigProperty(name = "loyalty.earn-percent", defaultValue = "5")
    BigDecimal earnPercent;

    /** Points an order of this grand total earns at the configured rate (half-up). */
    public int pointsFor(Money grandTotal) {
        return grandTotal.amount().multiply(earnPercent)
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP)
                .intValue();
    }

    /** Credits the buyer for a delivered order. No-op when the order already earned. */
    @Transactional
    public void earnForDeliveredOrder(CustomerOrder order) {
        if (order == null || order.status() != CustomerOrder.Status.DELIVERED) return;
        if (LoyaltyTransaction.findByOrderAndType(order.id, LoyaltyTransaction.Type.EARN) != null)
            return; // already earned — replaying delivery must not double-credit
        int points = pointsFor(order.grandTotal());
        if (points <= 0) return;
        accountFor(order.email()).earn(points, order.id, "order " + order.orderCode() + " delivered");
    }

    /** Redeems points against a placed order: discount off the grand total, GST untouched. */
    @Transactional
    public int redeemAtCheckout(CustomerOrder order, int pointsToRedeem) {
        if (pointsToRedeem <= 0) throw new DomainException("pointsToRedeem must be positive");
        CustomerOrder target = CustomerOrder.findById(order.id);
        if (target == null) throw new DomainException("order not found");
        LoyaltyAccount account = LoyaltyAccount.findByEmail(target.email());
        if (account == null || pointsToRedeem > account.pointsBalance())
            throw new DomainException("not enough loyalty points (balance "
                    + (account == null ? 0 : account.pointsBalance()) + ")");
        int used = target.applyRedemption(pointsToRedeem);
        account.redeem(used, target.id, "redeemed at checkout " + target.orderCode());
        return used;
    }

    /** Admin adjustment — signed points, reason mandatory. */
    @Transactional
    public LoyaltyTransaction adjust(Long accountId, int points, String reason) {
        LoyaltyAccount account = LoyaltyAccount.findById(accountId);
        if (account == null) throw new DomainException("loyalty account not found");
        return account.adjust(points, reason);
    }

    /** Customer-facing balance view. */
    public Map<String, Object> balance(LoyaltyAccount account, String email) {
        return Map.of(
                "email", email.trim().toLowerCase(),
                "balance", account == null ? 0 : account.pointsBalance(),
                "lifetimeEarned", account == null ? 0 : account.lifetimeEarned());
    }

    private LoyaltyAccount accountFor(String email) {
        LoyaltyAccount account = LoyaltyAccount.findByEmail(email);
        if (account == null) {
            account = LoyaltyAccount.open(email);
            account.persist();
        }
        return account;
    }
}
