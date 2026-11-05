package com.feldnstein.platform.loyalty;

import com.feldnstein.platform.commerce.shared.DomainException;
import com.feldnstein.platform.gaanugu.settings.Audited;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Admin loyalty API — account search for ops, reasoned adjustment for admins.
 * Thin driving adapter over {@link LoyaltyService}.
 */
@Path("/g/loyalty")
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed({"ADMIN", "OPERATOR"})
public class LoyaltyResource {

    @Inject LoyaltyService loyalty;

    @GET
    @Path("/accounts")
    public Response accounts(@QueryParam("q") String q) {
        String needle = q == null || q.isBlank() ? null : q.trim().toLowerCase();
        List<Map<String, Object>> rows = LoyaltyAccount.<LoyaltyAccount>streamAll()
                .filter(a -> needle == null || a.email().contains(needle))
                .sorted(Comparator.comparing(LoyaltyAccount::email))
                .map(this::row)
                .toList();
        return Response.ok(rows).build();
    }

    public record AdjustRequest(Integer points, String reason) {}

    @POST
    @Path("/accounts/{id}/adjust")
    @RolesAllowed("ADMIN")
    @Transactional
    @Audited("LOYALTY_ADJUST")
    public Response adjust(@PathParam("id") Long id, AdjustRequest body) {
        if (body == null || body.points() == null)
            throw new DomainException("points is required");
        LoyaltyTransaction tx = loyalty.adjust(id, body.points(), body.reason());
        return Response.ok(row(tx.account())).build();
    }

    private Map<String, Object> row(LoyaltyAccount a) {
        Map<String, Object> m = new LinkedHashMap<String, Object>();
        m.put("id", a.id);
        m.put("email", a.email());
        m.put("balance", a.pointsBalance());
        m.put("lifetimeEarned", a.lifetimeEarned());
        m.put("lifetimeRedeemed", a.lifetimeRedeemed());
        return m;
    }
}
