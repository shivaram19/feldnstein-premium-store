package com.feldnstein.platform.gaanugu.catalog;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import com.feldnstein.platform.gaanugu.catalog.ReviewService.ReviewDraft;
import jakarta.inject.Inject;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

@QuarkusTest
class ReviewServiceTest {

    @Inject ReviewService reviews;

    @Test
    void approvedOnly_andSummaryComputed() {
        QuarkusTransaction.requiringNew().run(() -> {
            Map<String, Object> summary = reviews.summaryFor(1L);
            assertEquals(3, summary.get("count")); // V22 seed: three approved groundnut reviews
            assertEquals(4.7, summary.get("average")); // (5+4+5)/3 = 4.666… rounded to 4.7

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> rows = (List<Map<String, Object>>) summary.get("reviews");
            assertFalse(rows.isEmpty());
            assertTrue(rows.stream().noneMatch(r -> r.get("title") == null));
        });
    }

    @Test
    void submitStoresPending_neverPublic() {
        Long[] id = new Long[1];
        QuarkusTransaction.requiringNew().run(() -> {
            String rejected = reviews.submit(new ReviewDraft(1L, "Test Buyer", 5, "Pending one", "Should not render publicly."));
            assertNull(rejected);
            id[0] = reviews.pending().get(reviews.pending().size() - 1).id;
        });

        QuarkusTransaction.requiringNew().run(() -> {
            assertTrue(reviews.pending().stream().anyMatch(r -> r.id.equals(id[0])));
        });

        QuarkusTransaction.requiringNew().run(() -> {
            assertTrue(reviews.approve(id[0]));
            assertFalse(reviews.pending().stream().anyMatch(r -> r.id.equals(id[0])));
            assertTrue(reviews.approvedFor(1L).stream().anyMatch(r -> r.id.equals(id[0])));
            // Keep the shared test DB pristine for the summary assertions.
            ProductReview.deleteById(id[0]);
        });
    }

    @Test
    void rejectsInvalidInput() {
        QuarkusTransaction.requiringNew().run(() -> {
            assertNotNull(reviews.submit(new ReviewDraft(null, "A", 5, "T", "B")));
            assertNotNull(reviews.submit(new ReviewDraft(1L, "A", 0, "T", "B")));
            assertNotNull(reviews.submit(new ReviewDraft(1L, "A", 6, "T", "B")));
            assertNotNull(reviews.submit(new ReviewDraft(999L, "A", 5, "T", "B")));
            assertNotNull(reviews.submit(new ReviewDraft(1L, " ", 5, "T", "B")));
            assertNotNull(reviews.submit(new ReviewDraft(1L, "A", 5, " ", "B")));
        });
    }
}
