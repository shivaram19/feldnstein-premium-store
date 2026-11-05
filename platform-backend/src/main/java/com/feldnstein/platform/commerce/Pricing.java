package com.feldnstein.platform.commerce;

import com.feldnstein.platform.commerce.shared.DomainException;
import com.feldnstein.platform.commerce.shared.GstRate;
import com.feldnstein.platform.commerce.shared.Money;
import com.feldnstein.platform.gaanugu.catalog.ProductVariant;
import com.feldnstein.platform.gaanugu.settings.PriceConfig;
import jakarta.enterprise.context.ApplicationScoped;

/**
 * Pricing policy — domain service of the Sales context. The active SELLING
 * price configuration wins; the variant's MRP is the fallback. Prices are
 * always ex-GST {@link Money}; the rate rides along as a {@link GstRate}.
 */
@ApplicationScoped
public class Pricing {

    public PriceConfig sellingConfig(ProductVariant variant) {
        return PriceConfig.<PriceConfig>find(
                "variant = ?1 and priceType = ?2 and active order by effectiveFrom desc",
                variant, PriceConfig.PriceType.SELLING).firstResult();
    }

    public Money unitPrice(ProductVariant variant) {
        PriceConfig cfg = sellingConfig(variant);
        if (cfg != null) return Money.of(cfg.amount);
        if (variant.mrp != null) return Money.of(variant.mrp);
        throw new DomainException("no selling price configured for " + variant.sku);
    }

    public GstRate gstRate(ProductVariant variant) {
        PriceConfig cfg = sellingConfig(variant);
        return GstRate.of(cfg != null ? cfg.gstPct : java.math.BigDecimal.ZERO);
    }
}
