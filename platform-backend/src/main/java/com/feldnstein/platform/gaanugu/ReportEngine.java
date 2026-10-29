package com.feldnstein.platform.gaanugu;

import jakarta.enterprise.context.ApplicationScoped;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Report row-building engine (ADR-0011). Lives in an unsecured bean so both the ADMIN-only
 * resource and the scheduler thread can use it — @RolesAllowed on ReportsResource would
 * otherwise reject scheduler-triggered invocations (no security identity there).
 */
@ApplicationScoped
public class ReportEngine {

    public List<String[]> inventorySummary() {
        return StockLevel.<StockLevel>streamAll()
                .sorted((a, b) -> a.variant.sku.compareTo(b.variant.sku))
                .map(s -> {
                    BigDecimal value = s.unitCost != null
                            ? s.unitCost.multiply(BigDecimal.valueOf(s.onHand)) : BigDecimal.ZERO;
                    return new String[]{s.variant.sku, s.variant.product.name, s.variant.sizeMl + "ml",
                            s.warehouse.name, s.batch != null ? s.batch.batchCode : "",
                            String.valueOf(s.onHand), String.valueOf(s.reserved), String.valueOf(s.onHold),
                            String.valueOf(s.getAvailable()), str(s.unitCost), str(value),
                            s.expiryDate != null ? s.expiryDate.toString() : ""};
                }).toList();
    }

    public static final String INVENTORY_SUMMARY_HEADER =
            "SKU,Product,Size,Warehouse,Batch,OnHand,Reserved,OnHold,Available,UnitCost,Value,Expiry";

    public List<String[]> productionYield() {
        return ProductionBatch.<ProductionBatch>streamAll()
                .sorted((a, b) -> b.pressDate.compareTo(a.pressDate))
                .map(b -> {
                    BigDecimal yieldPct = b.seedQtyKg != null && b.seedQtyKg.signum() > 0 && b.oilYieldLitres != null
                            ? b.oilYieldLitres.divide(b.seedQtyKg, 4, RoundingMode.HALF_UP)
                                    .multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP)
                            : null;
                    BigDecimal totalCost = nz(b.seedCostTotal).add(nz(b.handlerWageCost)).add(nz(b.bullFeedCost))
                            .add(nz(b.pressMaintenanceCost)).add(nz(b.stoneWearCost)).add(nz(b.shedCost))
                            .add(nz(b.packagingCost));
                    BigDecimal costPerLitre = b.oilYieldLitres != null && b.oilYieldLitres.signum() > 0
                            ? totalCost.divide(b.oilYieldLitres, 2, RoundingMode.HALF_UP) : null;
                    return new String[]{b.batchCode, b.product.name, b.pressDate.toString(), b.status.name(),
                            b.seedType, str(b.seedQtyKg), str(b.oilYieldLitres), str(yieldPct),
                            str(totalCost), str(costPerLitre),
                            b.bull != null ? b.bull.name : "", b.operator != null ? b.operator.name : ""};
                }).toList();
    }

    public static final String PRODUCTION_YIELD_HEADER =
            "Batch,Product,PressDate,Status,SeedType,SeedKg,YieldLitres,YieldPct,TotalCost,CostPerLitre,Bull,Operator";

    public List<String[]> expiryFefo() {
        LocalDate today = LocalDate.now();
        return StockLevel.<StockLevel>streamAll()
                .filter(s -> s.expiryDate != null)
                .sorted((a, b) -> a.expiryDate.compareTo(b.expiryDate))
                .map(s -> new String[]{s.variant.sku, s.variant.product.name, s.warehouse.name,
                        s.batch != null ? s.batch.batchCode : "", s.expiryDate.toString(),
                        String.valueOf(ChronoUnit.DAYS.between(today, s.expiryDate)),
                        String.valueOf(s.onHand)})
                .toList();
    }

    public static final String EXPIRY_FEFO_HEADER = "SKU,Product,Warehouse,Batch,Expiry,DaysToExpiry,OnHand";

    public List<String[]> procurementSpend() {
        Map<String, List<SeedProcurement>> byFarmer = SeedProcurement.<SeedProcurement>streamAll()
                .collect(Collectors.groupingBy(s -> s.farmer != null ? s.farmer.name : "unknown"));
        return byFarmer.entrySet().stream()
                .map(e -> {
                    BigDecimal qty = e.getValue().stream().map(s -> s.qtyKg).reduce(BigDecimal.ZERO, BigDecimal::add);
                    BigDecimal cost = e.getValue().stream().map(s -> s.totalCost).reduce(BigDecimal.ZERO, BigDecimal::add);
                    long paid = e.getValue().stream()
                            .filter(s -> s.paymentStatus == SeedProcurement.PaymentStatus.PAID).count();
                    return new String[]{e.getKey(), String.valueOf(e.getValue().size()), str(qty), str(cost),
                            paid + "/" + e.getValue().size()};
                }).toList();
    }

    public static final String PROCUREMENT_SPEND_HEADER = "Farmer,Purchases,QtyKg,TotalCost,Paid";

    /** Whitelisted custom builder over the stock_movement ledger (ADR-0011). */
    public List<String[]> ledger(String from, String to, String groupBy, Long variantId,
                                 Long warehouseId, String type) {
        LocalDate fromDate = from != null ? LocalDate.parse(from) : LocalDate.now().minusMonths(3);
        LocalDate toDate = to != null ? LocalDate.parse(to) : LocalDate.now();

        var stream = StockMovement.<StockMovement>streamAll()
                .filter(m -> !m.movedAt.isBefore(fromDate.atStartOfDay(ZoneOffset.UTC).toInstant())
                        && !m.movedAt.isAfter(toDate.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant()))
                .filter(m -> variantId == null || m.variant.id.equals(variantId))
                .filter(m -> warehouseId == null
                        || (m.fromWarehouse != null && m.fromWarehouse.id.equals(warehouseId))
                        || (m.toWarehouse != null && m.toWarehouse.id.equals(warehouseId)))
                .filter(m -> type == null || m.type.name().equals(type));

        return switch (groupBy) {
            case "PRODUCT" -> {
                Map<String, List<StockMovement>> g = stream.collect(Collectors.groupingBy(m -> m.variant.sku));
                yield g.entrySet().stream().map(e -> new String[]{e.getKey(), String.valueOf(e.getValue().size()),
                        String.valueOf(e.getValue().stream().mapToInt(m -> m.quantity).sum())}).toList();
            }
            case "WAREHOUSE" -> {
                Map<String, List<StockMovement>> g = stream.collect(Collectors.groupingBy(
                        m -> (m.toWarehouse != null ? m.toWarehouse.name
                                : m.fromWarehouse != null ? m.fromWarehouse.name : "unknown")));
                yield g.entrySet().stream().map(e -> new String[]{e.getKey(), String.valueOf(e.getValue().size()),
                        String.valueOf(e.getValue().stream().mapToInt(m -> m.quantity).sum())}).toList();
            }
            default -> {
                Map<String, List<StockMovement>> g = stream.collect(Collectors.groupingBy(m -> m.type.name()));
                yield g.entrySet().stream().map(e -> new String[]{e.getKey(), String.valueOf(e.getValue().size()),
                        String.valueOf(e.getValue().stream().mapToInt(m -> m.quantity).sum())}).toList();
            }
        };
    }

    public static final String LEDGER_HEADER = "Key,Movements,TotalQty";

    /** CSV for a scheduled run. Report type names match report_schedule.report_type. */
    public String csvFor(String reportType, String paramsJson) {
        try {
            return switch (reportType) {
                case "INVENTORY_SUMMARY" -> csv(INVENTORY_SUMMARY_HEADER, inventorySummary());
                case "PRODUCTION_YIELD" -> csv(PRODUCTION_YIELD_HEADER, productionYield());
                case "EXPIRY_FEFO" -> csv(EXPIRY_FEFO_HEADER, expiryFefo());
                case "PROCUREMENT_SPEND" -> csv(PROCUREMENT_SPEND_HEADER, procurementSpend());
                default -> csv(LEDGER_HEADER, ledger(null, null, "TYPE", null, null, null));
            };
        } catch (Exception e) {
            return "ERROR," + e.getMessage();
        }
    }

    public Object render(String format, String header, List<String[]> rows) {
        if (!"csv".equalsIgnoreCase(format)) {
            List<Map<String, Object>> out = new ArrayList<>();
            String[] cols = header.split(",");
            for (String[] r : rows) {
                Map<String, Object> m = new HashMap<>();
                for (int i = 0; i < cols.length && i < r.length; i++) m.put(cols[i], r[i]);
                out.add(m);
            }
            return out;
        }
        return csv(header, rows);
    }

    public String csv(String header, List<String[]> rows) {
        StringBuilder sb = new StringBuilder(header).append("\n");
        for (String[] r : rows) {
            for (int i = 0; i < r.length; i++) {
                if (i > 0) sb.append(',');
                sb.append(escape(r[i]));
            }
            sb.append('\n');
        }
        return sb.toString();
    }

    private String escape(String v) {
        if (v == null) return "";
        return v.contains(",") || v.contains("\"") ? "\"" + v.replace("\"", "\"\"") + "\"" : v;
    }

    private static String str(Object o) { return o != null ? o.toString() : ""; }

    private static BigDecimal nz(BigDecimal b) { return b != null ? b : BigDecimal.ZERO; }
}
