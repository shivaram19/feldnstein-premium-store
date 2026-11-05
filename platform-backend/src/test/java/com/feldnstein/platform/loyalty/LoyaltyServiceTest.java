package com.feldnstein.platform.loyalty;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.feldnstein.platform.commerce.order.CustomerOrder;
import com.feldnstein.platform.commerce.order.FulfillmentService;
import com.feldnstein.platform.commerce.shared.DeliveryAddress;
import com.feldnstein.platform.commerce.shared.DomainException;
import com.feldnstein.platform.commerce.shared.EmailAddress;
import com.feldnstein.platform.commerce.shared.GstRate;
import com.feldnstein.platform.commerce.shared.Money;
import com.feldnstein.platform.commerce.shared.OrderNo;
import com.feldnstein.platform.commerce.shared.Quantity;
import com.feldnstein.platform.gaanugu.catalog.OilProduct;
import com.feldnstein.platform.gaanugu.catalog.ProductVariant;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

@QuarkusTest
class LoyaltyServiceTest {

    @Inject LoyaltyService loyalty;
    @Inject FulfillmentService fulfillment;

    @Test
    void deliverThroughFulfillmentEarnsPoints() {
        long stamp = System.nanoTime();
        ProductVariant variant = persistVariant(stamp);
        String email = "earn-" + stamp + "@example.com";
        CustomerOrder order = persistShippedOrder(variant, email, 2, Money.of(100));

        QuarkusTransaction.requiringNew().run(() ->
                fulfillment.deliver(CustomerOrder.<CustomerOrder>findById(order.id)));

        QuarkusTransaction.requiringNew().run(() -> {
            CustomerOrder delivered = CustomerOrder.<CustomerOrder>streamAll()
                    .filter(o -> o.email().equals(email)).findFirst().orElseThrow();
            assertEquals(CustomerOrder.Status.DELIVERED, delivered.status());
            LoyaltyAccount account = LoyaltyAccount.findByEmail(email);
            assertNotNull(account, "delivery must open the buyer's loyalty account");
            assertEquals(10, account.pointsBalance(), "5% of ₹200 rounded half-up");
            assertEquals(10, account.lifetimeEarned());
            LoyaltyTransaction tx = LoyaltyTransaction.findByOrderAndType(delivered.id, LoyaltyTransaction.Type.EARN);
            assertNotNull(tx, "exactly one EARN ledger row for the order");
            assertEquals(10, tx.points());
            assertEquals(10, tx.balanceAfter());
        });
    }

    @Test
    void earnIsIdempotentAcrossDoubleDelivery() {
        long stamp = System.nanoTime();
        ProductVariant variant = persistVariant(stamp);
        String email = "idem-" + stamp + "@example.com";
        CustomerOrder order = persistShippedOrder(variant, email, 1, Money.of(100));

        QuarkusTransaction.requiringNew().run(() ->
                fulfillment.deliver(CustomerOrder.<CustomerOrder>findById(order.id)));
        QuarkusTransaction.requiringNew().run(() -> loyalty.earnForDeliveredOrder(order));

        QuarkusTransaction.requiringNew().run(() -> {
            LoyaltyAccount account = LoyaltyAccount.findByEmail(email);
            assertEquals(5, account.pointsBalance(), "second earn must be a no-op");
            assertEquals(1, LoyaltyTransaction.<LoyaltyTransaction>streamAll()
                    .filter(t -> t.type() == LoyaltyTransaction.Type.EARN)
                    .filter(t -> t.orderId() != null && t.orderId().equals(order.id))
                    .count(), "still exactly one EARN row for the order");
        });
    }

    @Test
    void pointsForRoundsHalfUp() {
        assertEquals(5, loyalty.pointsFor(Money.of(100)), "5% of 100");
        assertEquals(6, loyalty.pointsFor(Money.of(110)), "5.5 rounds half-up to 6");
        assertEquals(1, loyalty.pointsFor(Money.of(10)), "0.5 rounds half-up to 1");
    }

    @Test
    void redeemReducesGrandTotalAndBalance() {
        long stamp = System.nanoTime();
        ProductVariant variant = persistVariant(stamp);
        String email = "redeem-" + stamp + "@example.com";
        CustomerOrder order = persistPlacedOrder(variant, email, 2, Money.of(100));
        Long accountId = QuarkusTransaction.requiringNew().call(() -> seedAccount(email, 100));

        QuarkusTransaction.requiringNew().run(() -> loyalty.redeemAtCheckout(order, 50));

        QuarkusTransaction.requiringNew().run(() -> {
            CustomerOrder reloaded = CustomerOrder.findById(order.id);
            assertEquals(0, new BigDecimal("150.00").compareTo(reloaded.grandTotal().amount()),
                    "grand total drops by ₹50 (1 point = ₹1, post-GST)");
            assertEquals(50, reloaded.pointsRedeemed());
            LoyaltyAccount account = LoyaltyAccount.findByEmail(email);
            assertEquals(50, account.pointsBalance());
            assertEquals(50, account.lifetimeRedeemed());
            LoyaltyTransaction tx = LoyaltyTransaction.findByOrderAndType(order.id, LoyaltyTransaction.Type.REDEEM);
            assertNotNull(tx);
            assertEquals(50, tx.balanceAfter());
        });
    }

    @Test
    void redeemAboveBalanceRejected() {
        long stamp = System.nanoTime();
        ProductVariant variant = persistVariant(stamp);
        String email = "over-" + stamp + "@example.com";
        CustomerOrder order = persistPlacedOrder(variant, email, 1, Money.of(100));
        QuarkusTransaction.requiringNew().run(() -> seedAccount(email, 10));

        DomainException thrown = assertThrows(DomainException.class, () ->
                QuarkusTransaction.requiringNew().run(() -> loyalty.redeemAtCheckout(order, 50)));
        org.junit.jupiter.api.Assertions.assertTrue(thrown.getMessage().contains("points"));
    }

    @Test
    void adjustValidatesAndClampsAtZero() {
        long stamp = System.nanoTime();
        String email = "adjust-" + stamp + "@example.com";
        Long id = QuarkusTransaction.requiringNew().call(() -> {
            LoyaltyAccount account = LoyaltyAccount.open(email);
            account.persist();
            return account.id;
        });

        assertThrows(DomainException.class, () ->
                QuarkusTransaction.requiringNew().run(() -> loyalty.adjust(id, 0, "zero is not an adjustment")));
        assertThrows(DomainException.class, () ->
                QuarkusTransaction.requiringNew().run(() -> loyalty.adjust(id, 5, "  ")));

        QuarkusTransaction.requiringNew().run(() -> loyalty.adjust(id, 20, "goodwill"));
        QuarkusTransaction.requiringNew().run(() -> {
            assertEquals(20, LoyaltyAccount.<LoyaltyAccount>findById(id).pointsBalance());
            assertEquals(1, LoyaltyTransaction.<LoyaltyTransaction>streamAll()
                    .filter(t -> t.type() == LoyaltyTransaction.Type.ADJUST)
                    .filter(t -> t.account().id.equals(id)).count());
        });

        QuarkusTransaction.requiringNew().run(() -> loyalty.adjust(id, -100, "correction"));
        QuarkusTransaction.requiringNew().run(() ->
                assertEquals(0, LoyaltyAccount.<LoyaltyAccount>findById(id).pointsBalance(), "adjustment clamps at zero"));
    }

    private Long seedAccount(String email, int points) {
        LoyaltyAccount account = LoyaltyAccount.findByEmail(email);
        if (account == null) {
            account = LoyaltyAccount.open(email);
            account.persist();
        }
        loyalty.adjust(account.id, points, "seed");
        return account.id;
    }

    /** A persisted SHIPPED ₹100/line order — ready for {@code FulfillmentService.deliver}. */
    private static CustomerOrder persistShippedOrder(ProductVariant variant, String email, int qty, Money unit) {
        CustomerOrder order = persistPlacedOrder(variant, email, qty, unit);
        QuarkusTransaction.requiringNew().run(() -> {
            CustomerOrder reloaded = CustomerOrder.findById(order.id);
            Instant now = Instant.now();
            reloaded.markPaid(now);
            reloaded.confirm(now);
            reloaded.ship(now);
        });
        return CustomerOrder.findById(order.id);
    }

    private static CustomerOrder persistPlacedOrder(ProductVariant variant, String email, int qty, Money unit) {
        return QuarkusTransaction.requiringNew().call(() -> {
            CustomerOrder order = CustomerOrder.place(OrderNo.fresh(), "Loyalty Buyer",
                    new EmailAddress(email), "9999999999",
                    new DeliveryAddress("12 MG Road", "Bengaluru", "Karnataka", "560001"),
                    List.of(new CustomerOrder.LineDraft(variant, Quantity.of(qty), unit, GstRate.of(BigDecimal.ZERO))));
            order.persistAndFlush();
            return order;
        });
    }

    private static ProductVariant persistVariant(long stamp) {
        return QuarkusTransaction.requiringNew().call(() -> {
            OilProduct product = new OilProduct();
            product.code = "LOY-P-" + stamp;
            product.name = "Loyalty Product " + stamp;
            product.oilSource = OilProduct.OilSource.GROUNDNUT;
            product.persist();

            ProductVariant variant = new ProductVariant();
            variant.product = product;
            variant.sku = "LOY-V-" + stamp;
            variant.sizeMl = 500;
            variant.bottleType = ProductVariant.BottleType.GLASS;
            variant.capType = ProductVariant.CapType.ROPP;
            variant.persist();
            return variant;
        });
    }
}
