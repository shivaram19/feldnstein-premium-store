package com.feldnstein.platform.gaanugu.reports;

import com.feldnstein.platform.gaanugu.inventory.StockLevel;
import com.feldnstein.platform.gaanugu.procurement.SeedProcurement;
import com.feldnstein.platform.gaanugu.production.ProductionBatch;
import com.feldnstein.platform.gaanugu.production.QualityCheck;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.annotation.security.RolesAllowed;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Predicate;
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

    /** Chart-ready series for the analytics dashboard — every percentage is computed here. */
    @GET
    @Path("/charts")
    public Map<String, Object> charts() {
        Map<String, Object> m = new HashMap<>();
        LocalDate today = LocalDate.now();

        // ---- batch pipeline: counts + share of all batches ----
        long batchTotal = ProductionBatch.count();
        m.put("batchStatus", ProductionBatch.<ProductionBatch>streamAll()
                .collect(Collectors.groupingBy(b -> b.status.name(), Collectors.counting()))
                .entrySet().stream()
                .map(e -> row("status", e.getKey(),
                        "count", e.getValue(),
                        "pct", pct(e.getValue(), batchTotal)))
                .toList());

        // ---- QC trend: checks vs passed per month, last 6 months ----
        m.put("qcTrend", lastSixMonths().stream().map(mo -> {
            long checks = QualityCheck.<QualityCheck>streamAll()
                    .filter(q -> inMonth(q.checkedAt, mo)).count();
            long passed = QualityCheck.<QualityCheck>streamAll()
                    .filter(q -> inMonth(q.checkedAt, mo) && Boolean.TRUE.equals(q.overallPass)).count();
            return row("month", monthLabel(mo),
                    "checks", checks,
                    "passed", passed,
                    "passPct", pct(passed, checks));
        }).toList());

        // ---- oil yield per month (L), last 6 months ----
        m.put("yieldByMonth", lastSixMonths().stream().map(mo -> row(
                "month", monthLabel(mo),
                "litres", ProductionBatch.<ProductionBatch>streamAll()
                        .filter(b -> sameMonth(b.pressDate, mo))
                        .map(b -> b.oilYieldLitres != null ? b.oilYieldLitres : BigDecimal.ZERO)
                        .reduce(BigDecimal.ZERO, BigDecimal::add).stripTrailingZeros())).toList());

        // ---- top bulls by yield ----
        m.put("yieldByBull", ProductionBatch.<ProductionBatch>streamAll()
                .filter(b -> b.bull != null)
                .collect(Collectors.groupingBy(b -> b.bull.name,
                        Collectors.reducing(BigDecimal.ZERO,
                                b -> b.oilYieldLitres != null ? b.oilYieldLitres : BigDecimal.ZERO,
                                BigDecimal::add)))
                .entrySet().stream()
                .sorted(Map.Entry.<String, BigDecimal>comparingByValue().reversed())
                .limit(5)
                .map(e -> row("name", e.getKey(), "litres", e.getValue().stripTrailingZeros()))
                .toList());

        // ---- stock value by product (top 6 + Other) ----
        Map<String, BigDecimal> valueByProduct = StockLevel.<StockLevel>streamAll()
                .filter(s -> s.variant != null && s.variant.product != null)
                .collect(Collectors.groupingBy(s -> s.variant.product.name,
                        Collectors.reducing(BigDecimal.ZERO,
                                s -> s.unitCost != null
                                        ? s.unitCost.multiply(BigDecimal.valueOf(s.onHand))
                                        : BigDecimal.ZERO,
                                BigDecimal::add)));
        BigDecimal stockTotal = valueByProduct.values().stream()
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        List<Map<String, Object>> top = valueByProduct.entrySet().stream()
                .sorted(Map.Entry.<String, BigDecimal>comparingByValue().reversed())
                .limit(6)
                .map(e -> row("product", e.getKey(),
                        "value", e.getValue(),
                        "pct", pct(e.getValue(), stockTotal)))
                .collect(Collectors.toList());
        BigDecimal topSum = top.stream()
                .map(r -> (BigDecimal) r.get("value"))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (stockTotal.subtract(topSum).signum() > 0) {
            top.add(row("product", "Other",
                    "value", stockTotal.subtract(topSum),
                    "pct", pct(stockTotal.subtract(topSum), stockTotal)));
        }
        m.put("stockByProduct", top);

        // ---- availability split (share of units on hand) ----
        long onHand = StockLevel.<StockLevel>streamAll().mapToLong(s -> s.onHand).sum();
        long reserved = StockLevel.<StockLevel>streamAll().mapToLong(s -> s.reserved).sum();
        long onHold = StockLevel.<StockLevel>streamAll().mapToLong(s -> s.onHold).sum();
        m.put("availability", List.of(
                row("label", "Sellable", "units", onHand - reserved - onHold, "pct", pct(onHand - reserved - onHold, onHand)),
                row("label", "Reserved", "units", reserved, "pct", pct(reserved, onHand)),
                row("label", "On hold", "units", onHold, "pct", pct(onHold, onHand))));

        // ---- expiry risk: units in each window ----
        long exp30 = unitsExpiring(s -> !s.expiryDate.isAfter(today.plusDays(30)));
        long exp60 = unitsExpiring(s -> s.expiryDate.isAfter(today.plusDays(30))
                && !s.expiryDate.isAfter(today.plusDays(60)));
        long exp90 = unitsExpiring(s -> s.expiryDate.isAfter(today.plusDays(60))
                && !s.expiryDate.isAfter(today.plusDays(90)));
        long expLater = unitsExpiring(s -> s.expiryDate.isAfter(today.plusDays(90)));
        long noDate = StockLevel.<StockLevel>streamAll()
                .filter(s -> s.expiryDate == null).mapToLong(s -> s.onHand).sum();
        m.put("expiry", List.of(
                row("bucket", "≤ 30 days", "units", exp30),
                row("bucket", "31–60 days", "units", exp60),
                row("bucket", "61–90 days", "units", exp90),
                row("bucket", "> 90 days", "units", expLater),
                row("bucket", "No date", "units", noDate)));

        // ---- procurement spend per month, last 6 months ----
        m.put("spendByMonth", lastSixMonths().stream().map(mo -> {
            BigDecimal paid = SeedProcurement.<SeedProcurement>streamAll()
                    .filter(s -> sameMonth(s.procurementDate, mo) && s.paymentStatus == SeedProcurement.PaymentStatus.PAID)
                    .map(s -> s.totalCost).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal pending = SeedProcurement.<SeedProcurement>streamAll()
                    .filter(s -> sameMonth(s.procurementDate, mo) && s.paymentStatus == SeedProcurement.PaymentStatus.PENDING)
                    .map(s -> s.totalCost).reduce(BigDecimal.ZERO, BigDecimal::add);
            return row("month", monthLabel(mo), "paid", paid, "pending", pending);
        }).toList());

        return m;
    }

    /* ---- chart helpers ---- */

    private static java.util.List<YearMonth> lastSixMonths() {
        YearMonth now = YearMonth.now();
        java.util.List<YearMonth> months = new ArrayList<>();
        for (int i = 5; i >= 0; i--) months.add(now.minusMonths(i));
        return months;
    }

    private static boolean sameMonth(LocalDate date, YearMonth month) {
        return date != null && YearMonth.from(date).equals(month);
    }

    private static boolean inMonth(Instant instant, YearMonth month) {
        return instant != null && YearMonth.from(instant.atZone(ZoneId.systemDefault()).toLocalDate()).equals(month);
    }

    private static String monthLabel(YearMonth month) {
        return month.getMonth().name().substring(0, 3);
    }

    private static BigDecimal pct(long part, long whole) {
        return pct(BigDecimal.valueOf(part), BigDecimal.valueOf(whole));
    }

    private static BigDecimal pct(BigDecimal part, BigDecimal whole) {
        if (whole.signum() == 0) return BigDecimal.ZERO.setScale(1);
        return part.multiply(BigDecimal.valueOf(100)).divide(whole, 1, RoundingMode.HALF_UP);
    }

    private static long unitsExpiring(Predicate<StockLevel> bucket) {
        return StockLevel.<StockLevel>streamAll()
                .filter(s -> s.expiryDate != null)
                .filter(bucket)
                .mapToLong(s -> s.onHand).sum();
    }

    @SafeVarargs
    private static Map<String, Object> row(Object... kv) {
        Map<String, Object> r = new HashMap<>();
        for (int i = 0; i < kv.length; i += 2) r.put((String) kv[i], kv[i + 1]);
        return r;
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
