package com.feldnstein.platform.gaanugu;

import jakarta.annotation.security.RolesAllowed;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import java.util.List;

/** Read-only audit trail. ADMIN-only (segregation of duties, ADR-0010). */
@Path("/g/audit-events")
@Produces(MediaType.APPLICATION_JSON)
@RolesAllowed("ADMIN")
public class AuditResource {

    @GET
    public List<AuditEvent> list(@QueryParam("action") String action,
                                 @QueryParam("entityType") String entityType,
                                 @QueryParam("limit") @DefaultValue("200") int limit) {
        var query = AuditEvent.<AuditEvent>streamAll()
                .filter(e -> action == null || action.equals(e.action))
                .filter(e -> entityType == null || entityType.equals(e.entityType))
                .sorted((a, b) -> b.at.compareTo(a.at))
                .limit(limit);
        return query.toList();
    }
}
