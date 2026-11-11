package com.feldnstein.platform.commerce.order;

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
import java.util.List;
import java.util.Map;

/** Admin/ops order management — thin driving adapter over the fulfilment use cases. */
@Path("/g/orders")
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed({"ADMIN", "OPERATOR"})
@Transactional
public class OrderAdminResource {

    @Inject FulfillmentService fulfillment;
    @Inject OrderViews views;

    public record CancelRequest(String reason) {}

    @GET
    public Response list(@QueryParam("status") String status) {
        List<CustomerOrder> all = CustomerOrder.<CustomerOrder>streamAll()
                .sorted(Comparator.comparing(CustomerOrder::createdAt).reversed())
                .filter(o -> status == null || status.isBlank() || o.status().name().equalsIgnoreCase(status))
                .toList();
        return Response.ok(all.stream().map(views::listRow).toList()).build();
    }

    @GET
    @Path("/{code}")
    public Response detail(@PathParam("code") String code) {
        CustomerOrder order = CustomerOrder.findByCode(code);
        if (order == null) return Response.status(404).entity(Map.of("error", "order not found")).build();
        return Response.ok(views.detail(order)).build();
    }

    @POST
    @Path("/{code}/confirm")
    @Audited("ORDER_CONFIRM")
    public Response confirm(@PathParam("code") String code) {
        return act(code, fulfillment::confirm);
    }

    @POST
    @Path("/{code}/ship")
    @Audited("ORDER_SHIP")
    public Response ship(@PathParam("code") String code) {
        return act(code, fulfillment::ship);
    }

    @POST
    @Path("/{code}/deliver")
    @Audited("ORDER_DELIVER")
    public Response deliver(@PathParam("code") String code) {
        return act(code, fulfillment::deliver);
    }

    @POST
    @Path("/{code}/cancel")
    @Audited("ORDER_CANCEL")
    public Response cancel(@PathParam("code") String code, CancelRequest body) {
        CustomerOrder order = CustomerOrder.findByCode(code);
        if (order == null) return Response.status(404).entity(Map.of("error", "order not found")).build();
        FulfillmentService.ActionResult r = fulfillment.cancel(order, body == null ? null : body.reason());
        if (!r.ok()) return Response.status(400).entity(Map.of("error", r.message())).build();
        return Response.ok(views.detail(order)).build();
    }

    private Response act(String code, java.util.function.Function<CustomerOrder, FulfillmentService.ActionResult> action) {
        CustomerOrder order = CustomerOrder.findByCode(code);
        if (order == null) return Response.status(404).entity(Map.of("error", "order not found")).build();
        FulfillmentService.ActionResult r = action.apply(order);
        if (!r.ok()) return Response.status(400).entity(Map.of("error", r.message())).build();
        return Response.ok(views.detail(order)).build();
    }
}
