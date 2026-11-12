package com.feldnstein.platform.commerce.identity;

import com.feldnstein.platform.commerce.order.CustomerOrder;
import com.feldnstein.platform.commerce.order.OrderViews;
import com.feldnstein.platform.loyalty.LoyaltyAccount;
import com.feldnstein.platform.loyalty.LoyaltyService;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Signed-in customer read model (ADR-0023) — everything is aggregated by the
 * verified session email, so pre-existing guest orders appear the moment a
 * customer claims the address they were placed with.
 */
@Path("/shop/me")
@Produces(MediaType.APPLICATION_JSON)
public class MeResource {

    @Inject AuthService auth;
    @Inject OrderViews views;
    @Inject LoyaltyService loyalty;

    /** Profile, lifetime stats, loyalty balance, and the last delivery address for prefill. */
    @GET
    @Transactional
    public Response me(@jakarta.ws.rs.HeaderParam(AuthService.SESSION_HEADER) String sessionToken) {
        String email = auth.resolve(sessionToken);
        if (email == null) return Response.status(401).entity(Map.of("error", "sign in required")).build();

        List<CustomerOrder> orders = CustomerOrder
                .<CustomerOrder>list("email = ?1 order by createdAt desc", email);

        CustomerIdentity identity = CustomerIdentity.findByEmail(email);
        CustomerOrder latest = orders.isEmpty() ? null : orders.get(0);

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("email", email);
        m.put("name", identity != null && identity.name != null ? identity.name
                : latest != null ? latest.customerName() : null);
        m.put("memberSince", identity != null ? identity.createdAt.toString() : null);
        m.put("orderCount", orders.size());
        m.put("totalSpent", orders.stream()
                .filter(o -> o.status() != CustomerOrder.Status.CANCELLED)
                .map(o -> o.grandTotal().amount())
                .reduce(BigDecimal.ZERO, BigDecimal::add));
        m.put("loyalty", loyalty.balance(LoyaltyAccount.findByEmail(email), email));
        if (latest != null) {
            Map<String, Object> addr = new LinkedHashMap<>();
            addr.put("customerName", latest.customerName());
            addr.put("phone", latest.phone());
            addr.put("address", latest.deliveryAddress().addressLine());
            addr.put("city", latest.deliveryAddress().city());
            addr.put("state", latest.deliveryAddress().state());
            addr.put("pincode", latest.deliveryAddress().pincode());
            m.put("lastAddress", addr);
        }
        return Response.ok(m).build();
    }

    /** Order history (with lines, for one-tap reorder). */
    @GET
    @Path("/orders")
    @Transactional
    public Response orders(@jakarta.ws.rs.HeaderParam(AuthService.SESSION_HEADER) String sessionToken) {
        String email = auth.resolve(sessionToken);
        if (email == null) return Response.status(401).entity(Map.of("error", "sign in required")).build();
        List<Map<String, Object>> rows = CustomerOrder
                .<CustomerOrder>list("email = ?1 order by createdAt desc", email)
                .stream().map(views::detail).toList();
        return Response.ok(rows).build();
    }
}
