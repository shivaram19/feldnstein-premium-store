package com.feldnstein.platform.commerce.fulfillment;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.feldnstein.platform.commerce.order.CustomerOrder;
import com.feldnstein.platform.commerce.shared.DeliveryAddress;
import com.feldnstein.platform.commerce.shared.DomainException;
import com.feldnstein.platform.commerce.shared.EmailAddress;
import com.feldnstein.platform.commerce.shared.GstRate;
import com.feldnstein.platform.commerce.shared.Money;
import com.feldnstein.platform.commerce.shared.OrderNo;
import com.feldnstein.platform.commerce.shared.Quantity;
import com.feldnstein.platform.gaanugu.catalog.OilProduct;
import com.feldnstein.platform.gaanugu.catalog.ProductVariant;
import com.feldnstein.platform.gaanugu.inventory.StockLevel;
import com.feldnstein.platform.gaanugu.inventory.Warehouse;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

@QuarkusTest
class StockAllocatorTest {

    @Inject StockAllocator allocator;

    @Test
    void reserveMoreThanAvailableThrows() {
        long stamp = System.nanoTime();
        ProductVariant variant = persistVariant(stamp);
        persistStock(variant, 5);

        CustomerOrder order = orderFor(variant, 10);

        DomainException thrown = assertThrows(DomainException.class, () ->
                QuarkusTransaction.requiringNew().run(() -> allocator.reserve(order)));
        assertTrue(thrown.getMessage().contains(variant.sku), "exception must name the sku");

        QuarkusTransaction.requiringNew().run(() -> {
            StockLevel sl = StockLevel.<StockLevel>streamAll()
                    .filter(s -> s.variant.id.equals(variant.id)).findFirst().orElseThrow();
            assertEquals(5, sl.getAvailable(), "failed reservation must roll back its partial takes");
        });
    }

    @Test
    void reserveWithinAvailableRecordsSlices() {
        long stamp = System.nanoTime();
        ProductVariant variant = persistVariant(stamp);
        persistStock(variant, 5);

        CustomerOrder order = orderFor(variant, 4);

        QuarkusTransaction.requiringNew().run(() -> {
            var slices = allocator.reserve(order);
            assertEquals(1, slices.size());
            assertEquals(4, slices.get(0).qty());
        });
    }

    private static CustomerOrder orderFor(ProductVariant variant, int qty) {
        return CustomerOrder.place(OrderNo.fresh(), "Test Buyer", new EmailAddress("buyer@example.com"),
                "9999999999", new DeliveryAddress("12 MG Road", "Bengaluru", "Karnataka", "560001"),
                List.of(new CustomerOrder.LineDraft(variant, Quantity.of(qty), Money.of(100),
                        GstRate.of(BigDecimal.ZERO))));
    }

    private static ProductVariant persistVariant(long stamp) {
        return QuarkusTransaction.requiringNew().call(() -> {
            OilProduct product = new OilProduct();
            product.code = "ALLOC-P-" + stamp;
            product.name = "Alloc Product " + stamp;
            product.oilSource = OilProduct.OilSource.GROUNDNUT;
            product.persist();

            ProductVariant variant = new ProductVariant();
            variant.product = product;
            variant.sku = "ALLOC-V-" + stamp;
            variant.sizeMl = 500;
            variant.bottleType = ProductVariant.BottleType.GLASS;
            variant.capType = ProductVariant.CapType.ROPP;
            variant.persist();
            return variant;
        });
    }

    private static StockLevel persistStock(ProductVariant variant, int onHand) {
        return QuarkusTransaction.requiringNew().call(() -> {
            Warehouse warehouse = new Warehouse();
            warehouse.code = "ALLOC-W-" + variant.sku;
            warehouse.name = "Alloc Warehouse " + variant.sku;
            warehouse.type = Warehouse.WarehouseType.FULFILMENT;
            warehouse.persist();

            StockLevel sl = new StockLevel();
            sl.variant = variant;
            sl.warehouse = warehouse;
            sl.onHand = onHand;
            sl.persist();
            return sl;
        });
    }
}
