package com.feldnstein.platform.gaanugu.catalog;

import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.Map;

/** Moderation surface for reviews (ADR-0028). Admin-only. */
@Path("/g/reviews")
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
public class ReviewAdminResource {

    @Inject ReviewService reviews;

    @GET
    @Path("/pending")
    @RolesAllowed("ADMIN")
    @Transactional
    public Response pending() {
        return Response.ok(reviews.pending()).build();
    }

    @POST
    @Path("/{id}/approve")
    @RolesAllowed("ADMIN")
    @Transactional
    public Response approve(@PathParam("id") Long id) {
        if (!reviews.approve(id)) return Response.status(404).entity(Map.of("error", "review not found")).build();
        return Response.ok(Map.of("status", "approved")).build();
    }
}
