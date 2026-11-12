package com.feldnstein.platform.commerce.identity;

import com.feldnstein.platform.commerce.shared.DomainException;
import jakarta.inject.Inject;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.Map;

/**
 * Passwordless customer authentication (ADR-0023). Public endpoints — the
 * whole point is that buying never requires an account; identity is claimed
 * when the customer wants it (post-purchase or from the header).
 */
@Path("/shop/auth")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AuthResource {

    @Inject AuthService auth;

    public record MagicLinkRequest(String email) {}

    /** Send a single-use sign-in link to the inbox (always 202 — no account enumeration). */
    @POST
    @Path("/magic-link")
    public Response magicLink(MagicLinkRequest body) {
        if (body == null || body.email() == null) throw new BadRequestException("email is required");
        try {
            auth.requestLink(body.email());
        } catch (DomainException e) {
            throw new BadRequestException(e.getMessage());
        }
        return Response.accepted(Map.of("sent", true)).build();
    }

    public record VerifyRequest(String token) {}

    /** Redeem a magic link for a session token. */
    @POST
    @Path("/verify")
    public Response verify(VerifyRequest body) {
        if (body == null || body.token() == null) throw new BadRequestException("token is required");
        String sessionToken;
        try {
            sessionToken = auth.verify(body.token());
        } catch (DomainException e) {
            return Response.status(400).entity(Map.of("error", e.getMessage())).build();
        }
        return Response.ok(Map.of("token", sessionToken,
                "email", auth.resolve(sessionToken))).build();
    }

    /** End the session named by the X-Customer-Token header. */
    @POST
    @Path("/logout")
    public Response logout(@jakarta.ws.rs.HeaderParam(AuthService.SESSION_HEADER) String sessionToken) {
        auth.revoke(sessionToken);
        return Response.noContent().build();
    }

    /** Dev/e2e only: recover the pending sign-in token for an email (demo newsletter provider only). */
    @GET
    @Path("/dev-link")
    public Response devLink(@QueryParam("email") String email) {
        if (email == null || email.isBlank()) throw new BadRequestException("email is required");
        String token = auth.pendingLinkFor(email);
        if (token == null) throw new NotFoundException("no pending sign-in link for that email");
        return Response.ok(Map.of("token", token)).build();
    }
}
