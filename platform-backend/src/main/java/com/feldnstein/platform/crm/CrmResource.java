package com.feldnstein.platform.crm;

import com.feldnstein.platform.commerce.shared.DomainException;
import com.feldnstein.platform.gaanugu.settings.Audited;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PATCH;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Customer-360 admin API — aggregated customer views by email, plus the
 * single-platform CRM (ADR-0019): contact directory, interaction log,
 * follow-up tasks and WhatsApp/Instagram messaging behind the gateway port.
 * Thin driving adapter over {@link CrmService}.
 */
@Path("/g/crm")
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
@RolesAllowed({"ADMIN", "OPERATOR"})
public class CrmResource {

    @Inject CrmService crm;
    @Inject SecurityIdentity identity;

    public record ContactRequest(String email, String name, String phone, String whatsappPhone,
                                 Boolean whatsappOptIn, String whatsappOptInSource, String instagramHandle,
                                 String source, String tags, String status) {}

    public record InteractionRequest(String channel, String direction, String body, String handle) {}

    public record TaskRequest(String email, String subject, Instant dueAt) {}

    public record MessageRequest(String channel, String email, String text, String templateName,
                                 List<String> templateParams) {}

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

    @GET
    @Path("/contacts")
    public Response contacts(@QueryParam("q") String q, @QueryParam("status") String status) {
        return Response.ok(crm.contactsList(q, status)).build();
    }

    @POST
    @Path("/contacts")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response createContact(ContactRequest req) {
        CrmService.UpsertResult result = crm.upsert(
                req.email(), req.name(), req.phone(), req.whatsappPhone(),
                req.whatsappOptIn(), req.whatsappOptInSource(), req.instagramHandle(),
                req.source(), req.tags(), req.status());
        Response.ResponseBuilder builder = Response.status(result.created() ? 201 : 200);
        return builder.entity(crm.contactDetail(result.contact().email())).build();
    }

    @PATCH
    @Path("/contacts/{email}")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response patchContact(@PathParam("email") String email, ContactRequest req) {
        crm.upsert(email, req.name(), req.phone(), req.whatsappPhone(),
                req.whatsappOptIn(), req.whatsappOptInSource(), req.instagramHandle(),
                req.source(), req.tags(), req.status());
        Map<String, Object> view = crm.contactDetail(email);
        if (view == null)
            return Response.status(404).entity(Map.of("error", "no contact found for that email")).build();
        return Response.ok(view).build();
    }

    @GET
    @Path("/contacts/{email}")
    public Response contact(@PathParam("email") String email) {
        Map<String, Object> view = crm.contactDetail(email);
        if (view == null)
            return Response.status(404).entity(Map.of("error", "no contact found for that email")).build();
        return Response.ok(view).build();
    }

    @POST
    @Path("/contacts/{email}/interactions")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response addInteraction(@PathParam("email") String email, InteractionRequest req) {
        CrmInteraction interaction = crm.recordInteraction(
                email, req.channel(), req.direction(), req.body(), principal(), req.handle());
        return Response.status(201).entity(Map.of(
                "id", interaction.id,
                "channel", interaction.channel().name(),
                "direction", interaction.direction().name())).build();
    }

    @GET
    @Path("/tasks")
    public Response tasks(@QueryParam("open") boolean open) {
        return Response.ok(crm.openTasksList(open)).build();
    }

    @POST
    @Path("/tasks")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response createTask(TaskRequest req) {
        if (req.email() == null || req.email().isBlank()) throw new DomainException("email is required");
        CrmTask task = crm.addTask(req.email(), req.subject(), req.dueAt(), principal());
        return Response.status(201).entity(task.id).build();
    }

    @POST
    @Path("/tasks/{id}/done")
    public Response completeTask(@PathParam("id") Long id) {
        crm.completeTask(id);
        return Response.ok().build();
    }

    @POST
    @Path("/messages")
    @Consumes(MediaType.APPLICATION_JSON)
    @Audited("CRM_MESSAGE")
    public Response sendMessage(MessageRequest req) {
        if (req.email() == null || req.email().isBlank())
            throw new DomainException("email is required");
        return Response.ok(crm.sendMessage(
                req.channel(), req.email(), req.text(), req.templateName(), req.templateParams(), principal()))
                .build();
    }

    private String principal() {
        return identity.isAnonymous() ? "" : identity.getPrincipal().getName();
    }
}
