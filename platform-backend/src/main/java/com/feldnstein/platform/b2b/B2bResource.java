package com.feldnstein.platform.b2b;

import com.feldnstein.platform.commerce.shared.DomainException;
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
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

/**
 * B2B wholesale admin API — seller directory and wholesale order lifecycle.
 * Thin driving adapter over {@link B2bService}.
 */
@Path("/g/b2b")
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed({"ADMIN", "OPERATOR"})
@Transactional
public class B2bResource {

    @Inject B2bService b2b;

    public record SellerRequest(String code, String name, String contactName, String phone,
                                String email, String gst, String address) {}

    @GET
    @Path("/sellers")
    public Response sellers(@QueryParam("q") String q) {
        String needle = q == null || q.isBlank() ? null : q.trim().toLowerCase();
        List<Map<String, Object>> rows = B2bSeller.<B2bSeller>streamAll()
                .filter(s -> needle == null
                        || s.code.toLowerCase().contains(needle)
                        || s.name.toLowerCase().contains(needle))
                .sorted(Comparator.comparing(s -> s.code))
                .map(this::sellerRow)
                .toList();
        return Response.ok(rows).build();
    }

    @POST
    @Path("/sellers")
    public Response createSeller(SellerRequest body) {
        if (body == null || body.name() == null || body.name().isBlank())
            throw new DomainException("name is required");
        B2bSeller seller = new B2bSeller();
        seller.code = body.code() == null || body.code().isBlank()
                ? "SEL-" + Instant.now().toEpochMilli()
                        + String.format("%06d", ThreadLocalRandom.current().nextInt(1_000_000))
                : body.code().trim();
        seller.name = body.name().trim();
        seller.contactName = body.contactName();
        seller.phone = body.phone();
        seller.email = body.email();
        seller.gst = body.gst();
        seller.address = body.address();
        seller.persist();
        return Response.status(201).entity(sellerRow(seller)).build();
    }

    public record OrderLineRequest(Long variantId, Integer qty, Long unitPricePaise, BigDecimal gstPct) {}

    public record OrderRequest(Long sellerId, List<OrderLineRequest> lines, String notes) {}

    @GET
    @Path("/orders")
    public Response orders(@QueryParam("status") String status) {
        List<Map<String, Object>> rows = WholesaleOrder.<WholesaleOrder>streamAll()
                .sorted(Comparator.comparing(WholesaleOrder::orderDate).reversed())
                .filter(o -> status == null || status.isBlank()
                        || o.status().name().equalsIgnoreCase(status))
                .map(o -> orderRow(o, false))
                .toList();
        return Response.ok(rows).build();
    }

    @POST
    @Path("/orders")
    public Response createOrder(OrderRequest body) {
        if (body == null || body.sellerId() == null) throw new DomainException("sellerId is required");
        List<B2bService.LineSpec> specs = body.lines() == null ? List.of() : body.lines().stream()
                .map(l -> {
                    if (l == null || l.variantId() == null || l.qty() == null
                            || l.unitPricePaise() == null || l.gstPct() == null)
                        throw new DomainException("every line needs variantId, qty, unitPricePaise and gstPct");
                    return new B2bService.LineSpec(l.variantId(), l.qty(), l.unitPricePaise(), l.gstPct());
                })
                .toList();
        WholesaleOrder order = b2b.create(body.sellerId(), specs, body.notes());
        return Response.status(201).entity(orderRow(order, true)).build();
    }

    @GET
    @Path("/orders/{id}")
    public Response orderDetail(@PathParam("id") Long id) {
        WholesaleOrder order = WholesaleOrder.findById(id);
        if (order == null) return Response.status(404).entity(Map.of("error", "order not found")).build();
        return Response.ok(orderRow(order, true)).build();
    }

    public record StatusRequest(String status, Long warehouseId) {}

    @POST
    @Path("/orders/{id}/status")
    public Response advance(@PathParam("id") Long id, StatusRequest body) {
        if (body == null || body.status() == null) throw new DomainException("status is required");
        WholesaleOrder.Status target;
        try {
            target = WholesaleOrder.Status.valueOf(body.status().trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new DomainException("unknown status " + body.status());
        }
        WholesaleOrder order = b2b.advance(id, target, body.warehouseId());
        return Response.ok(orderRow(order, true)).build();
    }

    private Map<String, Object> sellerRow(B2bSeller s) {
        Map<String, Object> m = new LinkedHashMap<String, Object>();
        m.put("id", s.id);
        m.put("code", s.code);
        m.put("name", s.name);
        m.put("contactName", s.contactName == null ? "" : s.contactName);
        m.put("phone", s.phone == null ? "" : s.phone);
        m.put("email", s.email == null ? "" : s.email);
        m.put("gst", s.gst == null ? "" : s.gst);
        m.put("address", s.address == null ? "" : s.address);
        m.put("active", s.active);
        return m;
    }

    private Map<String, Object> orderRow(WholesaleOrder o, boolean detail) {
        Map<String, Object> m = new LinkedHashMap<String, Object>();
        m.put("id", o.id);
        m.put("orderNo", o.orderNo());
        m.put("status", o.status().name());
        m.put("orderDate", o.orderDate().toString());
        m.put("dispatchDate", o.dispatchDate() == null ? "" : o.dispatchDate().toString());
        m.put("deliveredDate", o.deliveredDate() == null ? "" : o.deliveredDate().toString());
        m.put("notes", o.notes() == null ? "" : o.notes());
        m.put("warehouseId", o.warehouse() == null ? null : o.warehouse().id);
        m.put("warehouseCode", o.warehouse() == null ? "" : o.warehouse().code);
        Map<String, Object> seller = new LinkedHashMap<String, Object>();
        seller.put("id", o.seller().id);
        seller.put("code", o.seller().code);
        seller.put("name", o.seller().name);
        m.put("seller", seller);
        m.put("subTotalPaise", o.subTotalPaise());
        m.put("gstTotalPaise", o.gstTotalPaise());
        m.put("grandTotalPaise", o.grandTotalPaise());
        m.put("subTotal", BigDecimal.valueOf(o.subTotalPaise(), 2));
        m.put("gstTotal", BigDecimal.valueOf(o.gstTotalPaise(), 2));
        m.put("grandTotal", BigDecimal.valueOf(o.grandTotalPaise(), 2));
        if (detail) {
            m.put("lines", o.lines().stream().map(l -> {
                Map<String, Object> line = new LinkedHashMap<String, Object>();
                line.put("variantId", l.variant().id);
                line.put("sku", l.variant().sku);
                line.put("product", l.variant().product != null ? l.variant().product.name : "");
                line.put("qty", l.qty());
                line.put("unitPricePaise", l.unitPricePaise());
                line.put("unitPrice", BigDecimal.valueOf(l.unitPricePaise(), 2));
                line.put("gstPct", l.gstPct());
                line.put("lineTotalPaise", l.lineTotalPaise());
                line.put("lineTotal", BigDecimal.valueOf(l.lineTotalPaise(), 2));
                return line;
            }).toList());
        }
        return m;
    }
}
