package com.feldnstein.platform.commerce;

import com.feldnstein.platform.gaanugu.catalog.ProductVariant;
import com.feldnstein.platform.gaanugu.settings.PriceConfig;
import java.math.BigDecimal;

/** Selling-price resolution: active SELLING price config wins, then the variant's MRP. */
public final class Pricing {

    private Pricing() {}

    public static PriceConfig sellingConfig(ProductVariant variant) {
        return PriceConfig.<PriceConfig>find(
                "variant = ?1 and priceType = ?2 and active order by effectiveFrom desc",
                variant, PriceConfig.PriceType.SELLING).firstResult();
    }

    public static BigDecimal unitPrice(ProductVariant variant) {
        PriceConfig cfg = sellingConfig(variant);
        if (cfg != null) return cfg.amount;
        return variant.mrp != null ? variant.mrp : BigDecimal.ZERO;
    }

    public static BigDecimal gstPct(ProductVariant variant) {
        PriceConfig cfg = sellingConfig(variant);
        if (cfg != null) return cfg.gstPct;
        return BigDecimal.ZERO;
    }

    /** Sellable units across all warehouses/stock positions of a variant. */
    public static long sellableUnits(ProductVariant variant) {
        return com.feldnstein.platform.gaanugu.inventory.StockLevel
                .<com.feldnstein.platform.gaanugu.inventory.StockLevel>streamAll()
                .filter(s -> s.variant != null && s.variant.id.equals(variant.id))
                .mapToLong(s -> s.getAvailable())
                .sum();
    }
}
