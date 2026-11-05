package com.feldnstein.platform.b2b;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.feldnstein.platform.commerce.shared.DomainException;
import com.feldnstein.platform.gaanugu.catalog.OilProduct;
import com.feldnstein.platform.gaanugu.catalog.ProductVariant;
import com.feldnstein.platform.gaanugu.inventory.StockLevel;
import com.feldnstein.platform.gaanugu.inventory.StockMovement;
import com.feldnstein.platform.gaanugu.inventory.Warehouse;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

@QuarkusTest
class B2bServiceTest {

    @Inject B2bService b2b;

    @Test
    void orderNoMatchesGeneratorPattern() {
        B2bOrderNo no = B2bOrderNo.fresh();
        assertTrue(no.value().matches("B2B-\\d+-\\d{6}"), "unexpected shape: " + no.value());
    }

    @Test
    void lifecycleHappyPathComputesTotalsAndDeductsStock() {
        long stamp = System.nanoTime();
        ProductVariant vA = persistVariant(stamp, "A");
        ProductVariant vB = persistVariant(stamp, "B");
        Warehouse warehouse = persistWarehouse(stamp);
        Long sellerId = persistSeller(stamp);
        persistStock(vA, warehouse, 5);
        persistStock(vB, warehouse, 3);

        WholesaleOrder order = QuarkusTransaction.requiringNew().call(() -> b2b.create(sellerId, List.of(
                new B2bService.LineSpec(vA.id, 2, 10000, new BigDecimal("5.0")),
                new B2bService.LineSpec(vB.id, 1, 5000, new BigDecimal("18.0"))), "test order"));

        assertEquals(WholesaleOrder.Status.DRAFT, order.status());
        assertEquals(25000, order.subTotalPaise(), "server-computed line totals");
        assertEquals(1900, order.gstTotalPaise(), "5% of 20000 = 1000, 18% of 5000 = 900");
        assertEquals(26900, order.grandTotalPaise());
        assertEquals(2, order.lines().size());

        WholesaleOrder confirmed = QuarkusTransaction.requiringNew().call(() ->
                b2b.advance(order.id, WholesaleOrder.Status.CONFIRMED, null));
        assertEquals(WholesaleOrder.Status.CONFIRMED, confirmed.status());

        WholesaleOrder dispatched = QuarkusTransaction.requiringNew().call(() ->
                b2b.advance(order.id, WholesaleOrder.Status.DISPATCHED, warehouse.id));
        assertEquals(WholesaleOrder.Status.DISPATCHED, dispatched.status());
        assertNotNull(dispatched.dispatchDate());
        assertEquals(warehouse.id, dispatched.warehouse().id);

        QuarkusTransaction.requiringNew().run(() -> {
            assertEquals(3, stockFor(vA, warehouse).onHand, "line A took 2 of 5");
            assertEquals(2, stockFor(vB, warehouse).onHand, "line B took 1 of 3");
            List<StockMovement> moves = StockMovement.<StockMovement>streamAll()
                    .filter(m -> m.type == StockMovement.MovementType.WHOLESALE_OUT)
                    .filter(m -> order.orderNo().equals(m.referenceId))
                    .toList();
            assertEquals(2, moves.size(), "one WHOLESALE_OUT ledger entry per line slice");
        });

        WholesaleOrder delivered = QuarkusTransaction.requiringNew().call(() ->
                b2b.advance(order.id, WholesaleOrder.Status.DELIVERED, null));
        assertEquals(WholesaleOrder.Status.DELIVERED, delivered.status());
        assertNotNull(delivered.deliveredDate());
    }

    @Test
    void illegalTransitionsRejected() {
        long stamp = System.nanoTime();
        ProductVariant v = persistVariant(stamp, "A");
        Warehouse w = persistWarehouse(stamp);
        Long sellerId = persistSeller(stamp);
        persistStock(v, w, 10);
        WholesaleOrder order = QuarkusTransaction.requiringNew().call(() ->
                b2b.create(sellerId, List.of(new B2bService.LineSpec(v.id, 1, 1000, new BigDecimal("0"))), null));

        assertThrows(DomainException.class, () -> QuarkusTransaction.requiringNew().run(() ->
                b2b.advance(order.id, WholesaleOrder.Status.DELIVERED, null)), "DRAFT cannot jump to DELIVERED");
        assertThrows(DomainException.class, () -> QuarkusTransaction.requiringNew().run(() ->
                b2b.advance(order.id, WholesaleOrder.Status.DISPATCHED, null)), "dispatch requires a warehouse");
        assertThrows(DomainException.class, () -> QuarkusTransaction.requiringNew().run(() ->
                b2b.advance(order.id, WholesaleOrder.Status.DISPATCHED, 999999L)), "unknown warehouse rejected");
    }

    @Test
    void cancelAllowedOnlyFromDraftOrConfirmed() {
        long stamp = System.nanoTime();
        ProductVariant v = persistVariant(stamp, "A");
        Warehouse w = persistWarehouse(stamp);
        Long sellerId = persistSeller(stamp);
        persistStock(v, w, 10);
        WholesaleOrder order = QuarkusTransaction.requiringNew().call(() ->
                b2b.create(sellerId, List.of(new B2bService.LineSpec(v.id, 1, 1000, new BigDecimal("0"))), null));

        QuarkusTransaction.requiringNew().run(() -> b2b.advance(order.id, WholesaleOrder.Status.CANCELLED, null));
        WholesaleOrder cancelled = QuarkusTransaction.requiringNew().call(() ->
                WholesaleOrder.<WholesaleOrder>findById(order.id));
        assertEquals(WholesaleOrder.Status.CANCELLED, cancelled.status());

        WholesaleOrder order2 = QuarkusTransaction.requiringNew().call(() ->
                b2b.create(sellerId, List.of(new B2bService.LineSpec(v.id, 1, 1000, new BigDecimal("0"))), null));
        QuarkusTransaction.requiringNew().run(() -> b2b.advance(order2.id, WholesaleOrder.Status.CONFIRMED, null));
        QuarkusTransaction.requiringNew().run(() -> b2b.advance(order2.id, WholesaleOrder.Status.DISPATCHED, w.id));

        WholesaleOrder dispatched = WholesaleOrder.findById(order2.id);
        assertThrows(DomainException.class, () -> QuarkusTransaction.requiringNew().run(() ->
                b2b.advance(dispatched.id, WholesaleOrder.Status.CANCELLED, null)),
                "DISPATCHED orders cannot be cancelled");
    }

    @Test
    void insufficientStockFailsClosedAndRollsBack() {
        long stamp = System.nanoTime();
        ProductVariant vA = persistVariant(stamp, "A");
        ProductVariant vB = persistVariant(stamp, "B");
        Warehouse warehouse = persistWarehouse(stamp);
        Long sellerId = persistSeller(stamp);
        persistStock(vA, warehouse, 3);
        persistStock(vB, warehouse, 2);

        WholesaleOrder order = QuarkusTransaction.requiringNew().call(() -> b2b.create(sellerId, List.of(
                new B2bService.LineSpec(vA.id, 3, 1000, new BigDecimal("0")),
                new B2bService.LineSpec(vB.id, 5, 1000, new BigDecimal("0"))), null));
        QuarkusTransaction.requiringNew().run(() -> b2b.advance(order.id, WholesaleOrder.Status.CONFIRMED, null));

        assertThrows(DomainException.class, () -> QuarkusTransaction.requiringNew().run(() ->
                b2b.advance(order.id, WholesaleOrder.Status.DISPATCHED, warehouse.id)));

        QuarkusTransaction.requiringNew().run(() -> {
            assertEquals(3, stockFor(vA, warehouse).onHand,
                    "line A's deduction must roll back with the failed dispatch");
            assertEquals(2, stockFor(vB, warehouse).onHand);
            WholesaleOrder reloaded = WholesaleOrder.findById(order.id);
            assertEquals(WholesaleOrder.Status.CONFIRMED, reloaded.status(), "status stays CONFIRMED");
            assertEquals(0, StockMovement.<StockMovement>streamAll()
                    .filter(m -> m.type == StockMovement.MovementType.WHOLESALE_OUT)
                    .filter(m -> order.orderNo().equals(m.referenceId)).count(), "no ledger entries");
        });
    }

    private static StockLevel stockFor(ProductVariant variant, Warehouse warehouse) {
        return StockLevel.<StockLevel>streamAll()
                .filter(s -> s.variant.id.equals(variant.id) && s.warehouse.id.equals(warehouse.id))
                .findFirst().orElseThrow();
    }

    private static Long persistSeller(long stamp) {
        return QuarkusTransaction.requiringNew().call(() -> {
            B2bSeller seller = new B2bSeller();
            seller.code = "SEL-" + stamp;
            seller.name = "Seller " + stamp;
            seller.persist();
            return seller.id;
        });
    }

    private static ProductVariant persistVariant(long stamp, String tag) {
        return QuarkusTransaction.requiringNew().call(() -> {
            OilProduct product = new OilProduct();
            product.code = "B2B-P-" + stamp + "-" + tag;
            product.name = "B2B Product " + stamp + " " + tag;
            product.oilSource = OilProduct.OilSource.GROUNDNUT;
            product.persist();
            ProductVariant variant = new ProductVariant();
            variant.product = product;
            variant.sku = "B2B-V-" + stamp + "-" + tag;
            variant.sizeMl = 500;
            variant.bottleType = ProductVariant.BottleType.GLASS;
            variant.capType = ProductVariant.CapType.ROPP;
            variant.persist();
            return variant;
        });
    }

    private static Warehouse persistWarehouse(long stamp) {
        return QuarkusTransaction.requiringNew().call(() -> {
            Warehouse warehouse = new Warehouse();
            warehouse.code = "B2B-W-" + stamp;
            warehouse.name = "B2B Warehouse " + stamp;
            warehouse.type = Warehouse.WarehouseType.FULFILMENT;
            warehouse.persist();
            return warehouse;
        });
    }

    private static StockLevel persistStock(ProductVariant variant, Warehouse warehouse, int onHand) {
        return QuarkusTransaction.requiringNew().call(() -> {
            StockLevel sl = new StockLevel();
            sl.variant = variant;
            sl.warehouse = warehouse;
            sl.onHand = onHand;
            sl.persist();
            return sl;
        });
    }
}
