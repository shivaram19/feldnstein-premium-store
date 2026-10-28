package com.feldnstein.platform;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

import jakarta.annotation.security.RolesAllowed;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

@Path("/analytics")
@Produces(MediaType.APPLICATION_JSON)
public class AnalyticsResource {

    @GET
    @Path("/summary")
    @RolesAllowed("ADMIN")
    public Map<String, Object> summary() {
        Map<String, Object> result = new HashMap<>();
        result.put("productCount", Product.count());
        result.put("totalStockUnits", Product.listAll().stream()
                .map(p -> (Product) p)
                .mapToInt(p -> p.stockQty)
                .sum());
        result.put("orderCount", PurchaseOrder.count());
        result.put("revenuePaid", PurchaseOrder.listAll().stream()
                .map(o -> (PurchaseOrder) o)
                .filter(o -> "PAID".equals(o.status))
                .map(o -> o.totalAmount != null ? o.totalAmount : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add));
        result.put("loyaltyMembers", LoyaltyAccount.count());
        result.put("pointsOutstanding", LoyaltyAccount.listAll().stream()
                .map(a -> (LoyaltyAccount) a)
                .mapToInt(a -> a.pointsBalance)
                .sum());
        return result;
    }
}
