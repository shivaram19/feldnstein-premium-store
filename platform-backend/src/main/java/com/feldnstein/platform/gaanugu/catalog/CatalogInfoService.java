package com.feldnstein.platform.gaanugu.catalog;

import com.feldnstein.platform.gaanugu.production.ProductionBatch;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Map;
import java.util.Optional;

/**
 * Public catalog queries (batch genealogy — citations-verified §D tension 2).
 * Read-only; surfaces the newest RELEASED batch of a product so the PDP can
 * state provenance with real data: batch code, press date, yield.
 */
@ApplicationScoped
public class CatalogInfoService {

    public Optional<Map<String, Object>> currentReleasedBatch(Long productId) {
        return ProductionBatch
                .<ProductionBatch>find("product.id = ?1 and status = ?2",
                        Sort.descending("pressDate"), productId, ProductionBatch.BatchStatus.RELEASED)
                .firstResultOptional()
                .map(b -> {
                    Map<String, Object> view = new java.util.HashMap<>(Map.of(
                            "batchCode", b.batchCode,
                            "pressDate", b.pressDate.toString(),
                            "bestBefore", b.bestBeforeDate.toString(),
                            "yieldLitres", b.oilYieldLitres));
                    // ADR-0030 move 7: the farmer is the emotional peak of the
                    // genealogy — name and place when the batch recorded one.
                    if (b.farmer != null) {
                        view.put("farmerName", b.farmer.name);
                        if (b.farmer.address != null) view.put("farmerPlace", b.farmer.address);
                    }
                    return view;
                });
    }
}
