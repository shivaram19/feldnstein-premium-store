package com.feldnstein.platform.marketing;

import com.feldnstein.platform.commerce.shared.DomainException;
import com.feldnstein.platform.commerce.shared.EmailAddress;
import jakarta.annotation.security.PermitAll;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.Map;

/**
 * Public storefront subscription endpoint — thin driving adapter over the
 * newsletter service. Idempotent: re-subscribing an existing email is a
 * success, not an error.
 */
@Path("/shop/subscribe")
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@PermitAll
public class SubscribeResource {

    @Inject NewsletterService newsletter;

    public record SubscribeRequest(String email, String name) {}

    @POST
    public Response subscribe(SubscribeRequest body) {
        if (body == null || body.email() == null || body.email().isBlank())
            return bad("email is required");
        String email = body.email().trim();
        try {
            new EmailAddress(email);
        } catch (DomainException e) {
            return Response.status(400).entity(Map.of("error", e.getMessage())).build();
        }
        String name = body.name() == null || body.name().isBlank() ? null : body.name().trim();
        newsletter.subscribe(email, name);
        return Response.ok(Map.of("status", "subscribed", "provider", newsletter.provider())).build();
    }

    private static Response bad(String msg) {
        return Response.status(400).entity(Map.of("error", msg)).build();
    }
}
