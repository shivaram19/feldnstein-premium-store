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
 * Public batch-genealogy endpoint (citations-verified §D tension 2): the PDP
 * shows the current RELEASED batch — pressed when, what it yielded — as the
 * premium defense against discount culture. Provenance, not price cuts.
 */
@Path("/shop/products")
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
public class ShopCatalogResource {

    @Inject CatalogInfoService catalog;

    @GET
    @Path("/{productId}/batch")
    @PermitAll
    public Response currentBatch(@PathParam("productId") Long productId) {
        return catalog.currentReleasedBatch(productId)
                .map(batch -> Response.ok(batch).build())
                .orElseGet(() -> Response.status(404).build());
    }
}
