package com.feldnstein.platform.gaanugu.catalog;

import jakarta.annotation.security.PermitAll;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

/**
 * Public catalog surface: released-batch genealogy and moderated review
 * summaries for the PDP. Both live under the class-level /shop/products root
 * — routing two-deep paths from a sibling @Path("/shop") class silently 404s
 * when this class-level root exists (found 2026-11-25: ReviewResource's
 * method-level /products/{id}/reviews was unreachable from the day this
 * resource landed; the 404 was masked by the frontend's catch-and-hide).
 */
@Path("/shop/products")
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
public class ShopCatalogResource {

    @Inject CatalogInfoService catalog;
    @Inject ReviewService reviews;

    @GET
    @Path("/{productId}/batch")
    @PermitAll
    public Response currentBatch(@PathParam("productId") Long productId) {
        return catalog.currentReleasedBatch(productId)
                .map(batch -> Response.ok(batch).build())
                .orElseGet(() -> Response.status(404).build());
    }

    @GET
    @Path("/{productId}/reviews")
    @PermitAll
    public Response reviewsFor(@PathParam("productId") Long productId) {
        return Response.ok(reviews.summaryFor(productId)).build();
    }
}
