package com.feldnstein.platform.gaanugu;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.annotation.security.RolesAllowed;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Aggregates for the inventory dashboard + analytics screens (Phase-1 spec).
 * ADMIN-only, consistent with ADR-0005's analytics restriction.
 */
@Path("/g/analytics")
@Produces(MediaType.APPLICATION_JSON)
@RolesAllowed("ADMIN")
public class GaanuguAnalyticsResource {

    @GET
    @Path("/dashboard")
    public Map<String, Object> dashboard() {
        Map<String, Object> m = new HashMap<>();

        // ---- inventory position ----
        Long units = StockLevel.<StockLevel>streamAll()
                .mapToLong(s -> s.onHand).sum();
        Long available = StockLevel.<StockLevel>streamAll()
                .mapToLong(s -> s.getAvailable()).sum();
        BigDecimal stockValue = StockLevel.<StockLevel>streamAll()
                .map(s -> s.unitCost != null ? s.unitCost.multiply(BigDecimal.valueOf(s.onHand)) : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long lowStock = StockLevel.<StockLevel>streamAll()
                .filter(s -> s.getAvailable() < 10).count();
        long expiringSoon = StockLevel.<StockLevel>streamAll()
                .filter(s -> s.expiryDate != null
                        && !s.expiryDate.isAfter(LocalDate.now().plusDays(30))).count();

        m.put("stockUnits", units);
        m.put("availableUnits", available);
        m.put("reservedUnits", units - available);
        m.put("stockValue", stockValue);
        m.put("lowStockCount", lowStock);
        m.put("expiringSoonCount", expiringSoon);

        // ---- production pipeline ----
        Map<String, Long> byStatus = ProductionBatch.<ProductionBatch>streamAll()
                .collect(Collectors.groupingBy(b -> b.status.name(), Collectors.counting()));
        m.put("batchesByStatus", byStatus);
        m.put("activeBatches", byStatus.entrySet().stream()
                .filter(e -> !"RELEASED".equals(e.getKey())).mapToLong(Map.Entry::getValue).sum());
        m.put("releasedBatches", byStatus.getOrDefault("RELEASED", 0L));
        m.put("qcPendingCount", byStatus.getOrDefault("QC_PENDING", 0L));
        m.put("todaysPressings", ProductionBatch.count("pressDate", LocalDate.now()));
        m.put("totalYieldLitres", ProductionBatch.<ProductionBatch>streamAll()
                .map(b -> b.oilYieldLitres != null ? b.oilYieldLitres : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add));

        // ---- quality ----
        long checksTotal = QualityCheck.count();
        long checksPassed = QualityCheck.count("overallPass", true);
        m.put("qcChecksTotal", checksTotal);
        m.put("qcPassRate", checksTotal == 0 ? null : BigDecimal.valueOf(100.0 * checksPassed / checksTotal));

        // ---- procurement ----
        Map<String, BigDecimal> spend = SeedProcurement.<SeedProcurement>streamAll()
                .collect(Collectors.groupingBy(s -> s.paymentStatus.name(),
                        Collectors.mapping(s -> s.totalCost, Collectors.reducing(BigDecimal.ZERO, BigDecimal::add))));
        m.put("procurementPaid", spend.getOrDefault("PAID", BigDecimal.ZERO));
        m.put("procurementPending", spend.getOrDefault("PENDING", BigDecimal.ZERO));

        return m;
    }

    /** Batch genealogy for the traceability report (page 25): farmer → batch → QC → stock. */
    @GET
    @Path("/traceability")
    public Object traceability() {
        return ProductionBatch.<ProductionBatch>listAll().stream()
                .map(b -> {
                    Map<String, Object> row = new HashMap<>();
                    row.put("batchCode", b.batchCode);
                    row.put("product", b.product != null ? b.product.name : null);
                    row.put("farmer", b.farmer != null ? b.farmer.name : null);
                    row.put("bull", b.bull != null ? b.bull.name : null);
                    row.put("operator", b.operator != null ? b.operator.name : null);
                    row.put("press", b.press != null ? b.press.code : null);
                    row.put("pressDate", b.pressDate);
                    row.put("status", b.status.name());
                    row.put("oilYieldLitres", b.oilYieldLitres);
                    return row;
                })
                .toList();
    }
}
