package com.feldnstein.platform.marketing;

import com.feldnstein.platform.commerce.shared.DomainException;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.Map;

/**
 * Admin marketing API — thin driving adapter over the marketing services.
 *
 * Subscriber list: both providers answer from the local {@code subscriber}
 * mirror that every subscription captured through this platform records, so
 * the admin view stays available even when Listmonk is unreachable; the
 * {@code provider} field says where new subscriptions actually go.
 */
@Path("/g/marketing")
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed({"ADMIN", "OPERATOR"})
public class MarketingResource {

    @Inject MarketingService marketing;
    @Inject NewsletterService newsletter;

    public record GenerateRequest(String task, Map<String, Object> context) {}

    @POST
    @Path("/generate")
    public Response generate(GenerateRequest body) {
        if (body == null || body.task() == null || body.task().isBlank())
            throw new DomainException("task is required");
        String text = marketing.generate(body.task(), body.context());
        return Response.ok(Map.of("text", text, "provider", marketing.provider())).build();
    }

    @GET
    @Path("/subscribers")
    public Response subscribers() {
        return Response.ok(Map.of(
                "subscribers", newsletter.subscriberRows(),
                "provider", newsletter.provider())).build();
    }
}
