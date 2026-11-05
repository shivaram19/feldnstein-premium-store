package com.feldnstein.platform.gaanugu.inventory;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.feldnstein.platform.commerce.shared.DomainException;
import com.feldnstein.platform.gaanugu.catalog.OilProduct;
import com.feldnstein.platform.gaanugu.catalog.ProductVariant;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

@QuarkusTest
class StockServiceAdjustmentTest {

    @Test
    void adjustmentBelowReservedThrows() {
        long stamp = System.nanoTime();
        StockLevel sl = persistStock(stamp, 10, 4);

        StockService service = new StockService();
        QuarkusTransaction.requiringNew().run(() -> {
            assertThrows(DomainException.class, () ->
                    service.adjust(new StockService.AdjustmentRequest(sl.id, 3, null, "shrink")));
        });
        QuarkusTransaction.requiringNew().run(() -> {
            StockLevel fresh = StockLevel.<StockLevel>findById(sl.id);
            assertEquals(10, fresh.onHand, "rejected adjustment must not change on hand");
        });
    }

    @Test
    void adjustmentEqualToReservedAllowed() {
        long stamp = System.nanoTime();
        StockLevel sl = persistStock(stamp, 10, 4);

        StockService service = new StockService();
        QuarkusTransaction.requiringNew().run(() -> {
            var res = service.adjust(new StockService.AdjustmentRequest(sl.id, 4, null, "count"));
            assertEquals(200, res.getStatus());
        });
        QuarkusTransaction.requiringNew().run(() -> {
            assertEquals(4, StockLevel.<StockLevel>findById(sl.id).onHand);
        });
    }

    private static StockLevel persistStock(long stamp, int onHand, int reserved) {
        return QuarkusTransaction.requiringNew().call(() -> {
            OilProduct product = new OilProduct();
            product.code = "ADJ-P-" + stamp;
            product.name = "Adjust Product " + stamp;
            product.oilSource = OilProduct.OilSource.SESAME;
            product.persist();

            ProductVariant variant = new ProductVariant();
            variant.product = product;
            variant.sku = "ADJ-V-" + stamp;
            variant.sizeMl = 1000;
            variant.bottleType = ProductVariant.BottleType.PET;
            variant.capType = ProductVariant.CapType.FLIP_TOP;
            variant.mrp = new BigDecimal("200.00");
            variant.persist();

            Warehouse warehouse = new Warehouse();
            warehouse.code = "ADJ-W-" + stamp;
            warehouse.name = "Adjust Warehouse " + stamp;
            warehouse.type = Warehouse.WarehouseType.FULFILMENT;
            warehouse.persist();

            StockLevel sl = new StockLevel();
            sl.variant = variant;
            sl.warehouse = warehouse;
            sl.onHand = onHand;
            sl.reserved = reserved;
            sl.persist();
            return sl;
        });
    }
}
