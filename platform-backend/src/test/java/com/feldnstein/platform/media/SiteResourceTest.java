package com.feldnstein.platform.media;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import com.feldnstein.platform.gaanugu.catalog.OilProduct;
import com.feldnstein.platform.gaanugu.catalog.ProductVariant;
import com.feldnstein.platform.gaanugu.settings.PriceConfig;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.Response;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

@QuarkusTest
class SiteResourceTest {

    @Inject SiteResource site;

    @Test
    @SuppressWarnings("unchecked")
    void catalogPricePicksLatestEffectiveConfig() {
        long stamp = System.nanoTime();
        long variantId = QuarkusTransaction.requiringNew().call(() -> {
            OilProduct product = new OilProduct();
            product.code = "SITE-P-" + stamp;
            product.name = "Site Product " + stamp;
            product.oilSource = OilProduct.OilSource.SUNFLOWER;
            product.persist();

            ProductVariant variant = new ProductVariant();
            variant.product = product;
            variant.sku = "SITE-V-" + stamp;
            variant.sizeMl = 500;
            variant.bottleType = ProductVariant.BottleType.GLASS;
            variant.capType = ProductVariant.CapType.ROPP;
            variant.persist();

            persistSellingPrice(variant, "100.00", LocalDate.of(2020, 1, 1));
            persistSellingPrice(variant, "150.00", LocalDate.of(2025, 1, 1));
            return variant.id;
        });

        QuarkusTransaction.requiringNew().run(() -> {
            Response response = site.products();
            assertEquals(200, response.getStatus());
            List<Map<String, Object>> products = (List<Map<String, Object>>) response.getEntity();
            Map<String, Object> mine = products.stream()
                    .filter(p -> p.get("code").equals("SITE-P-" + stamp)).findFirst().orElseThrow();
            List<Map<String, Object>> variants = (List<Map<String, Object>>) mine.get("variants");
            Map<String, Object> vm = variants.stream()
                    .filter(v -> v.get("id").equals(variantId)).findFirst().orElseThrow();
            assertNotNull(vm.get("price"));
            assertEquals(new BigDecimal("150.00"), vm.get("price"),
                    "catalog must show the latest effective selling price, same as Pricing charges");
        });
    }

    private static void persistSellingPrice(ProductVariant variant, String amount, LocalDate effectiveFrom) {
        PriceConfig cfg = new PriceConfig();
        cfg.variant = variant;
        cfg.priceType = PriceConfig.PriceType.SELLING;
        cfg.amount = new BigDecimal(amount);
        cfg.gstPct = new BigDecimal("5.00");
        cfg.effectiveFrom = effectiveFrom;
        cfg.persist();
    }
}
