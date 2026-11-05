package com.feldnstein.platform.commerce;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.feldnstein.platform.commerce.shared.DomainException;
import com.feldnstein.platform.gaanugu.catalog.OilProduct;
import com.feldnstein.platform.gaanugu.catalog.ProductVariant;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

@QuarkusTest
class PricingTest {

    @Inject Pricing pricing;

    @Test
    void unpricedVariantThrows() {
        long stamp = System.nanoTime();
        ProductVariant variant = persistVariant(stamp, null);
        QuarkusTransaction.requiringNew().run(() ->
                assertThrows(DomainException.class, () -> pricing.unitPrice(variant)));
    }

    @Test
    void mrpFallbackStillApplies() {
        long stamp = System.nanoTime();
        ProductVariant variant = persistVariant(stamp, new BigDecimal("180.00"));
        QuarkusTransaction.requiringNew().run(() ->
                assertEquals(new BigDecimal("180.00"), pricing.unitPrice(variant).amount()));
    }

    private static ProductVariant persistVariant(long stamp, BigDecimal mrp) {
        return QuarkusTransaction.requiringNew().call(() -> {
            OilProduct product = new OilProduct();
            product.code = "PRICE-P-" + stamp;
            product.name = "Price Product " + stamp;
            product.oilSource = OilProduct.OilSource.MUSTARD;
            product.persist();

            ProductVariant variant = new ProductVariant();
            variant.product = product;
            variant.sku = "PRICE-V-" + stamp;
            variant.sizeMl = 750;
            variant.bottleType = ProductVariant.BottleType.PET;
            variant.capType = ProductVariant.CapType.ROPP;
            variant.mrp = mrp;
            variant.persist();
            return variant;
        });
    }
}
