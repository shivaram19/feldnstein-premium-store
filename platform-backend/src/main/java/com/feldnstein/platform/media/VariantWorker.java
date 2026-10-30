package com.feldnstein.platform.media;

import io.quarkus.arc.Unremovable;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@Unremovable
@ApplicationScoped
public class VariantWorker {

    @Inject MediaAssetRepository assets;
    @Inject MediaService mediaService;

    @Scheduled(every = "2s")
    void tick() {
        MediaAsset next = QuarkusTransaction.requiringNew()
                .call(() -> assets.find("status = ?1 and finalized = true", MediaAsset.Status.DRAFT).firstResult());
        if (next != null) {
            Long id = next.id;
            try {
                QuarkusTransaction.requiringNew().run(() -> {
                    MediaAsset a = assets.findById(id);
                    if (a != null) mediaService.processOne(a);
                });
            } catch (Exception e) {
                QuarkusTransaction.requiringNew().run(() -> {
                    MediaAsset a = assets.findById(id);
                    if (a != null) mediaService.markError(a,
                            e.getMessage() == null ? "variant generation failed" : e.getMessage().substring(0, Math.min(e.getMessage().length(), 300)));
                });
            }
        }
        sweepOrphans();
    }

    /** Uploads that were presigned but never finalized are swept after 24h. */
    void sweepOrphans() {
        QuarkusTransaction.requiringNew().run(() -> assets
                .find("finalized = false and createdAt < ?1", java.time.Instant.now().minusSeconds(86400))
                .list().forEach(a -> {
                    try { mediaService.delete(a.id); } catch (Exception ignored) { /* best effort */ }
                }));
    }
}
