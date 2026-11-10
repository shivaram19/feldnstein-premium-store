package com.feldnstein.platform.economics;

import com.feldnstein.platform.commerce.shared.DomainException;
import com.feldnstein.platform.gaanugu.catalog.OilProduct;
import com.feldnstein.platform.gaanugu.catalog.ProductVariant;
import com.feldnstein.platform.gaanugu.production.ProductionBatch;
import com.feldnstein.platform.gaanugu.procurement.SeedProcurement;
import com.feldnstein.platform.gaanugu.settings.PriceConfig;
import io.quarkus.arc.Unremovable;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Economics engine (ADR-0020): the owner's forecast workbook as live code —
 * absorption costing per litre, variable material cost from procurement reality,
 * oil-cake credit, and margin-governed suggested/floor prices. Money is computed
 * in rupees (commerce Money convention) and exposed in paise longs.
 */
@Unremovable
@ApplicationScoped
public class EconomicsService {

    @ConfigProperty(name = "economics.material-cost-window-days", defaultValue = "180")
    int materialCostWindowDays;

    public enum MaterialSource { OVERRIDE, PROCUREMENT, NONE }

    public record ParamsForm(Integer tripsPerDay, BigDecimal outputPct, BigDecimal rawMaterialKgPerTrip,
                             BigDecimal materialCostPerKgOverride, BigDecimal dailyWages,
                             Integer wageDaysPerYear, BigDecimal yearlyFodder, BigDecimal bottlesPerLitre,
                             Long bottleCostPaise, BigDecimal shopAllocationPerYear, BigDecimal setupCost,
                             Integer depreciationYears) {}

    public record Params(int tripsPerDay, BigDecimal outputPct, BigDecimal rawMaterialKgPerTrip,
                         BigDecimal materialCostPerKgOverride, BigDecimal resolvedMaterialCostPerKg,
                         MaterialSource materialCostSource, BigDecimal dailyWages, int wageDaysPerYear,
                         BigDecimal yearlyFodder, BigDecimal bottlesPerLitre, long bottleCostPaise,
                         BigDecimal shopAllocationPerYear, BigDecimal setupCost, int depreciationYears) {}

    public record Intermediates(BigDecimal rawMaterialPerDay, BigDecimal yearlyProductionLitres,
                                BigDecimal materialCostPerYear, BigDecimal yearlyWages,
                                BigDecimal yearlyOverheads) {}

    public record PriceRuleView(BigDecimal targetMarginPct, BigDecimal minMarginPct) {}

    public record VariantPrice(long variantId, String sku, int sizeMl, Long activePricePaise,
                               Long pricePerLitrePaise, BigDecimal marginAtCurrentPct, boolean belowFloor) {}

    public record Snapshot(long productId, Params params, Intermediates intermediates,
                           long absorptionInclSetupPaise, long absorptionExclSetupPaise,
                           long cakeCreditPerLitrePaise, long netCostPaise, PriceRuleView priceRule,
                           Long suggestedPricePaise, Long floorPricePaise,
                           List<VariantPrice> variants, Instant computedAt) {}

    public record SensitivityRow(int materialDeltaPct, long absorptionInclSetupPaise, long netCostPaise,
                                 BigDecimal marginAtCurrentPricePct, BigDecimal marginAtSuggestedPct) {}

    public Snapshot snapshot(long productId) {
        ProductEconomics params = paramsOf(productId);
        return snapshot(params);
    }

    @Transactional
    public Snapshot upsertParams(long productId, ParamsForm form) {
        OilProduct product = productOf(productId);
        validateParams(form);
        ProductEconomics params = ProductEconomics.find("product.id", productId).firstResult();
        boolean create = params == null;
        if (create) {
            params = new ProductEconomics();
            params.product = product;
        }
        params.tripsPerDay = form.tripsPerDay();
        params.outputPct = form.outputPct();
        params.rawMaterialKgPerTrip = form.rawMaterialKgPerTrip();
        params.materialCostPerKgOverride = form.materialCostPerKgOverride();
        params.dailyWages = form.dailyWages();
        params.wageDaysPerYear = form.wageDaysPerYear() != null ? form.wageDaysPerYear() : 365;
        params.yearlyFodder = form.yearlyFodder();
        params.bottlesPerLitre = form.bottlesPerLitre();
        params.bottleCostPaise = form.bottleCostPaise();
        params.shopAllocationPerYear = form.shopAllocationPerYear();
        params.setupCost = form.setupCost();
        params.depreciationYears = form.depreciationYears();
        params.updatedAt = Instant.now();
        if (create) params.persist();
        return snapshot(params);
    }

    @Transactional
    public PriceRule setPriceRule(long productId, BigDecimal targetMarginPct, BigDecimal minMarginPct) {
        OilProduct product = productOf(productId);
        if (targetMarginPct == null || minMarginPct == null
                || targetMarginPct.signum() <= 0 || targetMarginPct.compareTo(BigDecimal.ONE) >= 0
                || minMarginPct.signum() <= 0 || minMarginPct.compareTo(BigDecimal.ONE) >= 0)
            throw new DomainException("target and min margin must both be in (0, 1)");
        if (targetMarginPct.compareTo(minMarginPct) <= 0)
            throw new DomainException("target margin must be greater than min margin");
        PriceRule rule = PriceRule.find("product", product).firstResult();
        if (rule == null) {
            rule = new PriceRule();
            rule.product = product;
        }
        rule.targetMarginPct = targetMarginPct;
        rule.minMarginPct = minMarginPct;
        rule.persist();
        return rule;
    }

    @Transactional
    public ByproductSale recordByproductSale(long productId, BigDecimal qtyKg, long pricePerKgPaise,
                                             String buyer, Long batchId, Instant soldAt) {
        OilProduct product = productOf(productId);
        if (qtyKg == null || qtyKg.signum() <= 0)
            throw new DomainException("qtyKg must be greater than 0");
        if (pricePerKgPaise < 0)
            throw new DomainException("pricePerKgPaise cannot be negative");
        ProductionBatch batch = null;
        if (batchId != null) {
            batch = ProductionBatch.findById(batchId);
            if (batch == null) throw new DomainException("no production batch with id " + batchId);
        }
        ByproductSale sale = new ByproductSale();
        sale.product = product;
        sale.batch = batch;
        sale.qtyKg = qtyKg;
        sale.pricePerKgPaise = pricePerKgPaise;
        sale.buyer = buyer;
        sale.soldAt = soldAt != null ? soldAt : Instant.now();
        sale.persist();
        return sale;
    }

    public List<ByproductSale> listByproductSales(Long productId) {
        List<ByproductSale> sales = productId != null
                ? ByproductSale.list("product.id", productId)
                : ByproductSale.listAll();
        sales.sort(Comparator.comparing((ByproductSale s) -> s.soldAt).reversed());
        return sales;
    }

    public List<SensitivityRow> sensitivity(long productId) {
        ProductEconomics params = paramsOf(productId);
        PriceRule rule = PriceRule.find("product", params.product).firstResult();
        PriceRuleView ruleView = ruleView(rule);
        BigDecimal materialCost = resolveMaterialCost(params).resolved;
        long cakeCreditPaise = cakeCreditPerLitrePaise(params.product);
        BigDecimal currentPricePerLitre = lowestActivePricePerLitre(params.product);

        List<SensitivityRow> rows = new ArrayList<>();
        for (int delta : new int[]{-20, -10, 0, 10, 20}) {
            BigDecimal factor = BigDecimal.ONE.add(BigDecimal.valueOf(delta).divide(BigDecimal.valueOf(100)));
            BigDecimal[] d = computeIntermediates(params, materialCost.multiply(factor));
            long inclPaise = toPaise(absorptionIncl(params, d[0], d[1]));
            long netCostPaise = Math.max(0, inclPaise - cakeCreditPaise);
            BigDecimal netCostRupees = BigDecimal.valueOf(netCostPaise).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            rows.add(new SensitivityRow(delta, inclPaise, netCostPaise,
                    marginPct(currentPricePerLitre, netCostRupees),
                    rule == null ? null : marginPct(suggestedPrice(ruleView, netCostRupees), netCostRupees)));
        }
        return rows;
    }

    Snapshot snapshot(ProductEconomics params) {
        MaterialResolution material = resolveMaterialCost(params);
        BigDecimal[] values = computeIntermediates(params, material.resolved);
        BigDecimal materialCostPerYear = values[0];
        BigDecimal yearlyProductionLitres = values[1];
        BigDecimal rawMaterialPerDay = values[2];
        BigDecimal yearlyWages = params.dailyWages.multiply(BigDecimal.valueOf(params.wageDaysPerYear));
        BigDecimal yearlyOverheads = materialCostPerYear.add(yearlyWages).add(params.yearlyFodder)
                .add(yearlyProductionLitres.multiply(params.bottlesPerLitre)
                        .multiply(rupees(params.bottleCostPaise)))
                .add(params.shopAllocationPerYear);
        Intermediates intermediates = new Intermediates(rawMaterialPerDay, yearlyProductionLitres,
                materialCostPerYear, yearlyWages, yearlyOverheads);

        long inclPaise = toPaise(absorptionIncl(params, materialCostPerYear, yearlyProductionLitres));
        long exclPaise = toPaise(yearlyOverheads.divide(yearlyProductionLitres, 10, RoundingMode.HALF_UP));
        long cakeCreditPaise = cakeCreditPerLitrePaise(params.product);
        long netCostPaise = Math.max(0, inclPaise - cakeCreditPaise);
        BigDecimal netCostRupees = BigDecimal.valueOf(netCostPaise).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        PriceRule rule = PriceRule.find("product", params.product).firstResult();
        PriceRuleView ruleView = ruleView(rule);
        BigDecimal floorPrice = rule == null ? null
                : netCostRupees.divide(BigDecimal.ONE.subtract(rule.minMarginPct), 6, RoundingMode.HALF_UP);

        List<VariantPrice> variants = new ArrayList<>();
        for (ProductVariant variant : ProductVariant.<ProductVariant>list("product", params.product)) {
            PriceConfig config = activeSellingPrice(variant);
            Long pricePerLitrePaise = null;
            Long pricePaise = null;
            BigDecimal margin = null;
            boolean belowFloor = false;
            if (config != null) {
                BigDecimal pricePerLitre = config.amount
                        .multiply(BigDecimal.valueOf(1000))
                        .divide(BigDecimal.valueOf(variant.sizeMl), 10, RoundingMode.HALF_UP);
                pricePaise = toPaise(config.amount);
                pricePerLitrePaise = toPaise(pricePerLitre);
                margin = marginPct(pricePerLitre, netCostRupees);
                belowFloor = floorPrice != null
                        && pricePerLitre.compareTo(floorPrice) < 0;
            }
            variants.add(new VariantPrice(variant.id, variant.sku, variant.sizeMl, pricePaise,
                    pricePerLitrePaise, margin, belowFloor));
        }

        return new Snapshot(params.product.id,
                new Params(params.tripsPerDay, params.outputPct, params.rawMaterialKgPerTrip,
                        params.materialCostPerKgOverride, material.resolved, material.source,
                        params.dailyWages, params.wageDaysPerYear, params.yearlyFodder,
                        params.bottlesPerLitre,
                        params.bottleCostPaise, params.shopAllocationPerYear, params.setupCost,
                        params.depreciationYears),
                intermediates, inclPaise, exclPaise, cakeCreditPaise, netCostPaise, ruleView,
                rule == null ? null : toPaise(suggestedPrice(ruleView, netCostRupees)),
                floorPrice == null ? null : toPaise(floorPrice),
                variants, Instant.now());
    }

    record MaterialResolution(BigDecimal resolved, MaterialSource source) {}

    MaterialResolution resolveMaterialCost(ProductEconomics params) {
        if (params.materialCostPerKgOverride != null)
            return new MaterialResolution(params.materialCostPerKgOverride, MaterialSource.OVERRIDE);
        String source = params.product.oilSource.name().toLowerCase();
        LocalDate since = LocalDate.now().minusDays(materialCostWindowDays);
        List<SeedProcurement> lots = SeedProcurement
                .list("lower(seedType) like ?1 and procurementDate >= ?2", "%" + source + "%", since);
        BigDecimal qty = BigDecimal.ZERO;
        BigDecimal value = BigDecimal.ZERO;
        for (SeedProcurement lot : lots) {
            qty = qty.add(lot.qtyKg);
            value = value.add(lot.qtyKg.multiply(lot.ratePerKg));
        }
        if (qty.signum() == 0)
            return new MaterialResolution(null, MaterialSource.NONE);
        return new MaterialResolution(value.divide(qty, 4, RoundingMode.HALF_UP), MaterialSource.PROCUREMENT);
    }

    long cakeCreditPerLitrePaise(OilProduct product) {
        Instant since = Instant.now().minus(materialCostWindowDays, ChronoUnit.DAYS);
        BigDecimal revenuePaise = BigDecimal.ZERO;
        for (ByproductSale sale : ByproductSale.<ByproductSale>list(
                "product = ?1 and soldAt >= ?2", product, since)) {
            revenuePaise = revenuePaise.add(
                    sale.qtyKg.multiply(BigDecimal.valueOf(sale.pricePerKgPaise)));
        }
        if (revenuePaise.signum() == 0) return 0;
        BigDecimal litres = BigDecimal.ZERO;
        LocalDate batchSince = LocalDate.ofInstant(since, ZoneOffset.UTC);
        for (ProductionBatch batch : ProductionBatch.<ProductionBatch>list(
                "product = ?1 and pressDate >= ?2 and oilYieldLitres is not null", product, batchSince)) {
            litres = litres.add(batch.oilYieldLitres);
        }
        if (litres.signum() == 0) return 0;
        return revenuePaise.divide(litres, 0, RoundingMode.HALF_UP).longValue();
    }

    BigDecimal[] computeIntermediates(ProductEconomics params, BigDecimal materialCostPerKg) {
        BigDecimal cost = materialCostPerKg != null ? materialCostPerKg : BigDecimal.ZERO;
        BigDecimal rawMaterialPerDay = BigDecimal.valueOf(params.tripsPerDay)
                .multiply(params.rawMaterialKgPerTrip);
        BigDecimal yearlyLitres = rawMaterialPerDay.multiply(params.outputPct)
                .multiply(BigDecimal.valueOf(365));
        BigDecimal materialCostPerYear = rawMaterialPerDay.multiply(BigDecimal.valueOf(365))
                .multiply(cost);
        return new BigDecimal[]{materialCostPerYear, yearlyLitres, rawMaterialPerDay};
    }

    BigDecimal absorptionIncl(ProductEconomics params, BigDecimal materialCostPerYear, BigDecimal yearlyLitres) {
        BigDecimal yearlyWages = params.dailyWages.multiply(BigDecimal.valueOf(params.wageDaysPerYear));
        BigDecimal yearlyOverheads = materialCostPerYear.add(yearlyWages).add(params.yearlyFodder)
                .add(yearlyLitres.multiply(params.bottlesPerLitre).multiply(rupees(params.bottleCostPaise)))
                .add(params.shopAllocationPerYear);
        BigDecimal yearlySetup = params.setupCost.divide(
                BigDecimal.valueOf(params.depreciationYears), 10, RoundingMode.HALF_UP);
        return yearlyOverheads.add(yearlySetup).divide(yearlyLitres, 10, RoundingMode.HALF_UP);
    }

    PriceConfig activeSellingPrice(ProductVariant variant) {
        return PriceConfig.find(
                        "variant = ?1 and priceType = ?2 and active = true and effectiveFrom <= ?3 "
                                + "order by effectiveFrom desc, id desc",
                        variant, PriceConfig.PriceType.SELLING, LocalDate.now())
                .firstResult();
    }

    BigDecimal lowestActivePricePerLitre(OilProduct product) {
        BigDecimal lowest = null;
        for (ProductVariant variant : ProductVariant.<ProductVariant>list("product", product)) {
            PriceConfig config = activeSellingPrice(variant);
            if (config == null) continue;
            BigDecimal perLitre = config.amount.multiply(BigDecimal.valueOf(1000))
                    .divide(BigDecimal.valueOf(variant.sizeMl), 10, RoundingMode.HALF_UP);
            if (lowest == null || perLitre.compareTo(lowest) < 0) lowest = perLitre;
        }
        return lowest;
    }

    static BigDecimal suggestedPrice(PriceRuleView rule, BigDecimal netCostRupees) {
        return netCostRupees.divide(BigDecimal.ONE.subtract(rule.targetMarginPct()), 6, RoundingMode.HALF_UP);
    }

    static BigDecimal marginPct(BigDecimal pricePerLitre, BigDecimal netCostRupees) {
        if (pricePerLitre == null || pricePerLitre.signum() == 0) return null;
        return pricePerLitre.subtract(netCostRupees)
                .divide(pricePerLitre, 4, RoundingMode.HALF_UP);
    }

    static BigDecimal rupees(long paise) {
        return BigDecimal.valueOf(paise).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    static long toPaise(BigDecimal rupees) {
        return rupees.multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.HALF_UP).longValue();
    }

    static PriceRuleView ruleView(PriceRule rule) {
        return rule == null ? null : new PriceRuleView(rule.targetMarginPct, rule.minMarginPct);
    }

    ProductEconomics paramsOf(long productId) {
        ProductEconomics params = ProductEconomics.find("product.id", productId).firstResult();
        if (params == null)
            throw new DomainException("no economics parameters configured for product " + productId);
        return params;
    }

    OilProduct productOf(long productId) {
        OilProduct product = OilProduct.findById(productId);
        if (product == null) throw new DomainException("no product with id " + productId);
        return product;
    }

    void validateParams(ParamsForm form) {
        if (form.tripsPerDay() == null || form.tripsPerDay() <= 0)
            throw new DomainException("tripsPerDay must be greater than 0");
        if (form.outputPct() == null || form.outputPct().signum() <= 0
                || form.outputPct().compareTo(BigDecimal.ONE) >= 0)
            throw new DomainException("outputPct must be in (0, 1)");
        requireNonNegative("rawMaterialKgPerTrip", form.rawMaterialKgPerTrip(), true);
        requireNonNegative("dailyWages", form.dailyWages(), false);
        if (form.wageDaysPerYear() != null && (form.wageDaysPerYear() < 1 || form.wageDaysPerYear() > 366))
            throw new DomainException("wageDaysPerYear must be between 1 and 366");
        requireNonNegative("yearlyFodder", form.yearlyFodder(), false);
        requireNonNegative("bottlesPerLitre", form.bottlesPerLitre(), false);
        requireNonNegative("shopAllocationPerYear", form.shopAllocationPerYear(), false);
        requireNonNegative("setupCost", form.setupCost(), false);
        if (form.materialCostPerKgOverride() != null
                && form.materialCostPerKgOverride().signum() < 0)
            throw new DomainException("materialCostPerKgOverride cannot be negative");
        if (form.bottleCostPaise() == null || form.bottleCostPaise() < 0)
            throw new DomainException("bottleCostPaise cannot be negative");
        if (form.depreciationYears() == null || form.depreciationYears() < 1)
            throw new DomainException("depreciationYears must be at least 1");
    }

    private static void requireNonNegative(String field, BigDecimal value, boolean strictlyPositive) {
        if (value == null || value.signum() < 0 || (strictlyPositive && value.signum() == 0))
            throw new DomainException(field + " must be " + (strictlyPositive ? "greater than 0" : "non-negative"));
    }
}
