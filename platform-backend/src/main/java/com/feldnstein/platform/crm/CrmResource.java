package com.feldnstein.platform.crm;

import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.Map;

/**
 * Customer-360 admin API — aggregated customer views by email.
 * Thin driving adapter over {@link CrmService}.
 */
@Path("/g/crm")
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
@RolesAllowed({"ADMIN", "OPERATOR"})
public class CrmResource {

    @Inject CrmService crm;

    @GET
    @Path("/customers")
    public Response customers(@QueryParam("q") String q) {
        return Response.ok(crm.customers(q)).build();
    }

    @GET
    @Path("/customers/{email}")
    public Response customer(@PathParam("email") String email) {
        Map<String, Object> view = crm.customer(email);
        if (view == null)
            return Response.status(404).entity(Map.of("error", "no customer found for that email")).build();
        return Response.ok(view).build();
    }
}
