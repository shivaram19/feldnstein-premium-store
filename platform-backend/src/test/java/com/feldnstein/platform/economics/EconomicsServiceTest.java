package com.feldnstein.platform.economics;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.feldnstein.platform.commerce.shared.DomainException;
import com.feldnstein.platform.economics.EconomicsService.MaterialSource;
import com.feldnstein.platform.economics.EconomicsService.SensitivityRow;
import com.feldnstein.platform.economics.EconomicsService.Snapshot;
import com.feldnstein.platform.gaanugu.catalog.OilProduct;
import com.feldnstein.platform.gaanugu.catalog.ProductVariant;
import com.feldnstein.platform.gaanugu.production.ProductionBatch;
import com.feldnstein.platform.gaanugu.procurement.SeedProcurement;
import com.feldnstein.platform.gaanugu.procurement.Supplier;
import com.feldnstein.platform.gaanugu.settings.PriceConfig;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.junit.jupiter.api.Test;

@QuarkusTest
class EconomicsServiceTest {

    @Inject EconomicsService economics;

    @Test
    void workbookKnownAnswerGroundnut() {
        long productId = newProduct("GROUNDNUT");
        economics.upsertParams(productId, new EconomicsService.ParamsForm(
                3, new BigDecimal("0.40"), new BigDecimal("12"), new BigDecimal("130"),
                new BigDecimal("1000"), 313, new BigDecimal("40000"), new BigDecimal("30"), 100L,
                new BigDecimal("144000"), new BigDecimal("740000"), 3));

        Snapshot snap = economics.snapshot(productId);
        assertEquals(0, new BigDecimal("36.00").compareTo(snap.intermediates().rawMaterialPerDay()));
        assertEquals(0, new BigDecimal("5256.00").compareTo(snap.intermediates().yearlyProductionLitres()));
        assertEquals(0, new BigDecimal("1708200.00").compareTo(snap.intermediates().materialCostPerYear()));
        assertEquals(0, new BigDecimal("313000.00").compareTo(snap.intermediates().yearlyWages()));
        assertEquals(0, new BigDecimal("2362880.00").compareTo(snap.intermediates().yearlyOverheads()));
        assertEquals(49649, snap.absorptionInclSetupPaise(), 2, "₹496.49/L — workbook parity at 313 wage-days");
        assertEquals(44956, snap.absorptionExclSetupPaise(), 2, "₹449.56/L — workbook parity at 313 wage-days");

        // The workbook's printed constants (496.4891 / 449.5586) embed 313-day wages;
        // wageDaysPerYear is configurable so the engine reproduces the sheet exactly.
        economics.upsertParams(productId, new EconomicsService.ParamsForm(
                3, new BigDecimal("0.40"), new BigDecimal("12"), new BigDecimal("130"),
                new BigDecimal("1000"), 313, new BigDecimal("40000"), new BigDecimal("30"), 100L,
                new BigDecimal("144000"), new BigDecimal("740000"), 3));
        Snapshot sheet = economics.upsertParams(productId, new EconomicsService.ParamsForm(
                5, new BigDecimal("0.40"), new BigDecimal("12"), new BigDecimal("130"),
                new BigDecimal("1000"), 313, new BigDecimal("40000"), new BigDecimal("30"), 100L,
                new BigDecimal("144000"), new BigDecimal("740000"), 3));
        assertEquals(0, new BigDecimal("313000.00").compareTo(sheet.intermediates().yearlyWages()));
        assertEquals(0, new BigDecimal("60.00").compareTo(sheet.intermediates().rawMaterialPerDay()));
        assertEquals(0, new BigDecimal("313").compareTo(BigDecimal.valueOf(sheet.params().wageDaysPerYear())));
        // update-path persistence is verified by e2e 15.1c against the dev runtime
    }

    @Test
    void suggestedAndFloorPricesFollowOwnerMarginDefinition() {
        long productId = newProduct("SESAME");
        Snapshot snap = economics.upsertParams(productId, minimalParams(new BigDecimal("190")));
        assertEquals(38000, snap.netCostPaise(), "absorption ₹200... ₹380/L with ₹190/kg material");

        economics.setPriceRule(productId, new BigDecimal("0.25"), new BigDecimal("0.05"));
        Snapshot priced = economics.snapshot(productId);
        assertEquals(50667, priced.suggestedPricePaise(), 1, "netCost/(1-0.25)");
        assertEquals(40000, priced.floorPricePaise(), 1, "netCost/(1-0.05)");
        assertEquals(0, new BigDecimal("0.25").compareTo(priced.priceRule().targetMarginPct()));
    }

    @Test
    void materialCostDefaultsToWindowedWeightedAverageProcurementRate() {
        long productId = newProduct("OTHER");
        String seed = "Eco other seed " + System.nanoTime();
        procure(seed, LocalDate.now().minusDays(10), "100.00", "100.00");
        procure(seed, LocalDate.now().minusDays(5), "300.00", "130.00");
        procure(seed, LocalDate.now().minusDays(400), "100.00", "999.00");

        Snapshot snap = economics.upsertParams(productId, minimalParams(null));
        assertEquals(MaterialSource.PROCUREMENT, snap.params().materialCostSource());
        assertEquals(0, new BigDecimal("122.50").compareTo(snap.params().resolvedMaterialCostPerKg()),
                "(100×100 + 300×130) / 400; stale lot excluded");
    }

    @Test
    void materialCostOverrideBeatsProcurementAndNullWhenNothingFound() {
        long withOverride = newProduct("GROUNDNUT");
        procure("Groundnut (Java)", LocalDate.now().minusDays(2), "50.00", "95.00");
        Snapshot overridden = economics.upsertParams(withOverride, minimalParams(new BigDecimal("150")));
        assertEquals(MaterialSource.OVERRIDE, overridden.params().materialCostSource());
        assertEquals(0, new BigDecimal("150").compareTo(overridden.params().resolvedMaterialCostPerKg()));

        long bare = newProduct("COCONUT");
        Snapshot empty = economics.upsertParams(bare, minimalParams(null));
        assertEquals(MaterialSource.NONE, empty.params().materialCostSource());
        assertNull(empty.params().resolvedMaterialCostPerKg());
        assertEquals(0, BigDecimal.ZERO.compareTo(empty.intermediates().materialCostPerYear()));
    }

    @Test
    void cakeCreditIsWindowedByproductRevenuePerBatchYieldLitre() {
        long productId = newProduct("GROUNDNUT");
        Snapshot before = economics.upsertParams(productId, minimalParams(new BigDecimal("190")));
        batch(productId, "38.00");
        batch(productId, "62.00");
        economics.recordByproductSale(productId, new BigDecimal("50"), 4000L, null, null, null);

        Snapshot snap = economics.snapshot(productId);
        assertEquals(2000, snap.cakeCreditPerLitrePaise(), "₹2,000 revenue / 100 L = ₹20/L");
        assertEquals(before.absorptionInclSetupPaise() - 2000, snap.netCostPaise());
    }

    @Test
    void cakeCreditZeroWhenEmptyAndWindowExcludesOldSales() {
        long productId = newProduct("GROUNDNUT");
        economics.upsertParams(productId, minimalParams(new BigDecimal("190")));
        assertEquals(0, economics.snapshot(productId).cakeCreditPerLitrePaise());

        batch(productId, "100.00");
        economics.recordByproductSale(productId, new BigDecimal("50"), 4000L, null, null,
                Instant.now().minus(400, ChronoUnit.DAYS));
        assertEquals(0, economics.snapshot(productId).cakeCreditPerLitrePaise(), "sale outside 180d window");
    }

    @Test
    void sensitivityDeltasAreMonotonicAndZeroDeltaMatchesSnapshot() {
        long productId = newProduct("GROUNDNUT");
        Snapshot base = economics.upsertParams(productId, minimalParams(new BigDecimal("190")));
        economics.setPriceRule(productId, new BigDecimal("0.25"), new BigDecimal("0.05"));
        long variant = variant(productId, "ECO-S-1000", 1000);
        sellingPrice(variant, "500.00");

        List<SensitivityRow> rows = economics.sensitivity(productId);
        assertEquals(5, rows.size());
        assertEquals(List.of(-20, -10, 0, 10, 20), rows.stream().map(SensitivityRow::materialDeltaPct).toList());
        for (int i = 0; i < rows.size() - 1; i++) {
            assertTrue(rows.get(i).marginAtCurrentPricePct()
                            .compareTo(rows.get(i + 1).marginAtCurrentPricePct()) > 0,
                    "margin decreases as material cost rises");
        }
        SensitivityRow zero = rows.get(2);
        assertEquals(base.absorptionInclSetupPaise(), zero.absorptionInclSetupPaise());
        assertEquals(base.netCostPaise(), zero.netCostPaise());
    }

    @Test
    void variantBelowFloorUsesPerLitreNormalisation() {
        long productId = newProduct("GROUNDNUT");
        economics.upsertParams(productId, minimalParams(new BigDecimal("190")));
        economics.setPriceRule(productId, new BigDecimal("0.25"), new BigDecimal("0.05"));
        long half = variant(productId, "ECO-H-500", 500);
        long oneL = variant(productId, "ECO-H-1000", 1000);
        sellingPrice(half, "208.00");
        sellingPrice(oneL, "389.00");

        Snapshot snap = economics.snapshot(productId);
        assertEquals(40000, snap.floorPricePaise(), 1);
        assertEquals(2, snap.variants().size());
        EconomicsService.VariantPrice halfView = snap.variants().stream()
                .filter(v -> v.variantId() == half).findFirst().orElseThrow();
        EconomicsService.VariantPrice oneLView = snap.variants().stream()
                .filter(v -> v.variantId() == oneL).findFirst().orElseThrow();
        assertEquals(41600, halfView.pricePerLitrePaise(), "₹208 / 0.5 L");
        assertEquals(38900, oneLView.pricePerLitrePaise());
        assertTrue(!halfView.belowFloor(), "₹416/L clears the ₹400 floor");
        assertTrue(oneLView.belowFloor(), "₹389/L breaches the ₹400 floor");
        assertEquals(0, new BigDecimal("0.0865").compareTo(halfView.marginAtCurrentPct()));
        assertEquals(0, new BigDecimal("0.0231").compareTo(oneLView.marginAtCurrentPct()));
    }

    @Test
    void paramValidationRejectsOutOfDomainValues() {
        long productId = newProduct("GROUNDNUT");
        assertThrows(DomainException.class, () -> economics.upsertParams(productId,
                new EconomicsService.ParamsForm(0, new BigDecimal("0.4"), BigDecimal.ONE, null,
                        BigDecimal.ZERO, 365, BigDecimal.ZERO, BigDecimal.ZERO, 0L, BigDecimal.ZERO, BigDecimal.ZERO, 1)));
        assertThrows(DomainException.class, () -> economics.upsertParams(productId,
                new EconomicsService.ParamsForm(1, BigDecimal.ONE, BigDecimal.ONE, null,
                        BigDecimal.ZERO, 365, BigDecimal.ZERO, BigDecimal.ZERO, 0L, BigDecimal.ZERO, BigDecimal.ZERO, 1)));
        assertThrows(DomainException.class, () -> economics.upsertParams(productId,
                new EconomicsService.ParamsForm(1, new BigDecimal("0.4"), BigDecimal.ONE, null,
                        new BigDecimal("-1"), 365, BigDecimal.ZERO, BigDecimal.ZERO, 0L, BigDecimal.ZERO, BigDecimal.ZERO, 1)));
        assertThrows(DomainException.class, () -> economics.upsertParams(productId,
                new EconomicsService.ParamsForm(1, new BigDecimal("0.4"), BigDecimal.ONE, null,
                        BigDecimal.ZERO, 365, BigDecimal.ZERO, BigDecimal.ZERO, 0L, BigDecimal.ZERO, BigDecimal.ZERO, 0)));
        assertThrows(DomainException.class, () -> economics.setPriceRule(productId,
                new BigDecimal("0.05"), new BigDecimal("0.25")));
        assertThrows(DomainException.class, () -> economics.recordByproductSale(productId,
                BigDecimal.ZERO, 100L, null, null, null));
    }

    static long newProduct(String source) {
        long[] id = new long[1];
        QuarkusTransaction.requiringNew().run(() -> {
            OilProduct p = new OilProduct();
            p.code = "ECO-" + source + "-" + System.nanoTime();
            p.name = "Eco Product " + p.code;
            p.oilSource = OilProduct.OilSource.valueOf(source);
            p.persist();
            id[0] = p.id;
        });
        return id[0];
    }

    static void procure(String seedType, LocalDate date, String qty, String rate) {
        QuarkusTransaction.requiringNew().run(() -> {
            Supplier farmer = Supplier.findById(1L);
            SeedProcurement s = new SeedProcurement();
            s.procurementDate = date;
            s.seedType = seedType;
            s.farmer = farmer;
            s.qtyKg = new BigDecimal(qty);
            s.ratePerKg = new BigDecimal(rate);
            s.totalCost = s.qtyKg.multiply(s.ratePerKg);
            s.persist();
        });
    }

    static void batch(long productId, String yieldLitres) {
        QuarkusTransaction.requiringNew().run(() -> {
            ProductionBatch b = new ProductionBatch();
            b.batchCode = "ECO-B-" + System.nanoTime();
            b.product = OilProduct.findById(productId);
            b.pressDate = LocalDate.now();
            b.seedType = "Groundnut (Java)";
            b.seedQtyKg = new BigDecimal("100");
            b.seedCostTotal = new BigDecimal("10000");
            b.oilYieldLitres = new BigDecimal(yieldLitres);
            b.persist();
        });
    }

    static long variant(long productId, String sku, int sizeMl) {
        long[] id = new long[1];
        QuarkusTransaction.requiringNew().run(() -> {
            ProductVariant v = new ProductVariant();
            v.product = OilProduct.findById(productId);
            v.sku = sku + "-" + System.nanoTime();
            v.sizeMl = sizeMl;
            v.bottleType = ProductVariant.BottleType.GLASS;
            v.capType = ProductVariant.CapType.ROPP;
            v.persist();
            id[0] = v.id;
        });
        return id[0];
    }

    static void sellingPrice(long variantId, String amount) {
        QuarkusTransaction.requiringNew().run(() -> {
            PriceConfig cfg = new PriceConfig();
            cfg.variant = ProductVariant.findById(variantId);
            cfg.priceType = PriceConfig.PriceType.SELLING;
            cfg.amount = new BigDecimal(amount);
            cfg.effectiveFrom = LocalDate.now().minusDays(1);
            cfg.active = true;
            cfg.persist();
        });
    }

    static EconomicsService.ParamsForm minimalParams(BigDecimal materialOverride) {
        return new EconomicsService.ParamsForm(1, new BigDecimal("0.5"), new BigDecimal("10"), materialOverride,
                BigDecimal.ZERO, 365, BigDecimal.ZERO, BigDecimal.ZERO, 0L,
                BigDecimal.ZERO, BigDecimal.ZERO, 1);
    }
}
