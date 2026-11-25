package com.feldnstein.platform.gaanugu.catalog;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;

@QuarkusTest
class CatalogInfoServiceTest {

    @Inject CatalogInfoService catalog;

    @Test
    void returnsNewestReleasedBatch() {
        QuarkusTransaction.requiringNew().run(() -> {
            Optional<Map<String, Object>> batch = catalog.currentReleasedBatch(1L);
            assertTrue(batch.isPresent());
            // V23 seed: B-2026-042 is the only RELEASED groundnut batch.
            assertEquals("B-2026-042", batch.get().get("batchCode"));
            assertEquals("2026-11-12", batch.get().get("pressDate"));
        });
    }

    @Test
    void midPipelineBatchNeverSurfaces() {
        QuarkusTransaction.requiringNew().run(() -> {
            // Product 1 also has the V2 batch B-2026-101 stuck in QC_PENDING —
            // genealogy must never sell stock that hasn't passed QC.
            Optional<Map<String, Object>> batch = catalog.currentReleasedBatch(1L);
            assertTrue(batch.isPresent());
            assertEquals("B-2026-042", batch.get().get("batchCode"));
        });
    }

    @Test
    void unknownProductIsEmpty() {
        QuarkusTransaction.requiringNew().run(() ->
                assertTrue(catalog.currentReleasedBatch(999L).isEmpty()));
    }
}
