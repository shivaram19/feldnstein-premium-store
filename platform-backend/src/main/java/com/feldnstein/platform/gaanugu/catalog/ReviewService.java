package com.feldnstein.platform.gaanugu.catalog;

import com.feldnstein.platform.commerce.order.OrderLine;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Review application service (ADR-0028). Submission is public; publication
 * is earned. The storefront reads only approved rows.
 */
@ApplicationScoped
public class ReviewService {

    public record ReviewDraft(Long productId, String authorName, Integer rating, String title, String body,
                              String orderCode) {
        /** Anonymous review without an order reference (ADR-0028 contract). */
        public ReviewDraft(Long productId, String authorName, Integer rating, String title, String body) {
            this(productId, authorName, rating, title, body, null);
        }
    }

    public List<ProductReview> approvedFor(Long productId) {
        return ProductReview
                .list("productId = ?1 and approved = true", Sort.descending("createdAt"), productId);
    }

    /** Public summary used by the PDP — null-safe when nothing is approved yet. */
    public Map<String, Object> summaryFor(Long productId) {
        List<ProductReview> reviews = approvedFor(productId);
        double avg = reviews.stream().mapToInt(r -> r.rating).average().orElse(0);
        return Map.of(
                "average", Math.round(avg * 10.0) / 10.0,
                "count", reviews.size(),
                "reviews", reviews.stream().map(ReviewService::view).toList());
    }

    /**
     * Stores a pending review. Returns an error string or null on success.
     * Publication happens only through {@link #approve(Long)}.
     */
    public String submit(ReviewDraft draft) {
        if (draft == null || draft.productId() == null) return "productId is required";
        if (OilProduct.findById(draft.productId()) == null) return "unknown product";
        if (draft.rating() == null || draft.rating() < 1 || draft.rating() > 5) return "rating must be 1-5";
        if (isBlank(draft.authorName()) || draft.authorName().length() > 96) return "authorName is required (max 96)";
        if (isBlank(draft.title()) || draft.title().length() > 160) return "title is required (max 160)";
        if (isBlank(draft.body()) || draft.body().length() > 2000) return "body is required (max 2000)";

        boolean verified = false;
        if (!isBlank(draft.orderCode())) {
            String code = draft.orderCode().trim();
            Long matches = OrderLine.count(
                    "order.orderCode = ?1 and variant.product.id = ?2", code, draft.productId());
            if (matches == 0) return "order code doesn't match this product";
            verified = true;
        }

        ProductReview review = new ProductReview();
        review.productId = draft.productId();
        review.authorName = draft.authorName().trim();
        review.rating = draft.rating();
        review.title = draft.title().trim();
        review.body = draft.body().trim();
        review.orderCode = isBlank(draft.orderCode()) ? null : draft.orderCode().trim();
        review.verifiedBuyer = verified;
        review.approved = false;
        review.persist();
        return null;
    }

    public List<ProductReview> pending() {
        return ProductReview.list("approved = false", Sort.ascending("createdAt"));
    }

    public boolean approve(Long id) {
        Optional<ProductReview> found = ProductReview.findByIdOptional(id);
        if (found.isEmpty()) return false;
        found.get().approved = true;
        return true;
    }

    private static Map<String, Object> view(ProductReview r) {
        return Map.of(
                "id", r.id,
                "author", r.authorName,
                "rating", r.rating,
                "title", r.title,
                "body", r.body,
                "verified", r.verifiedBuyer,
                "date", r.createdAt.toString());
    }

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }
}
