package com.feldnstein.platform.gaanugu.catalog;

import com.feldnstein.platform.gaanugu.catalog.ReviewService.ReviewDraft;
import jakarta.annotation.security.PermitAll;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.Map;

/**
 * Public review submission (ADR-0028). Stores pending; publication is
 * admin-gated (see ReviewAdminResource). The read side lives on
 * ShopCatalogResource — see its javadoc for why (two-deep sibling routing).
 */
@Path("/shop")
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ReviewResource {

    @Inject ReviewService reviews;

    @POST
    @Path("/reviews")
    @PermitAll
    @Transactional
    public Response submit(ReviewDraft body) {
        String rejected = reviews.submit(body);
        if (rejected != null) return Response.status(400).entity(Map.of("error", rejected)).build();
        return Response.status(202).entity(Map.of("status", "pending moderation")).build();
    }
}
