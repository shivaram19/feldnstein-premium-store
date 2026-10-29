package com.feldnstein.platform.gaanugu;

import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Reports endpoints (ADR-0011). ADMIN-only, consistent with the analytics restriction (ADR-0005).
 * Row-building lives in {@link ReportEngine} (unsecured) so the scheduler can reuse it.
 * Every report renders as JSON by default or CSV via ?format=csv.
 */
@Path("/g/reports")
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
@RolesAllowed("ADMIN")
public class ReportsResource {

    @Inject
    ReportEngine engine;

    // ============ STANDARD REPORTS ============

    @GET
    @Path("/inventory-summary")
    public Object inventorySummary(@QueryParam("format") String format) {
        return engine.render(format, ReportEngine.INVENTORY_SUMMARY_HEADER, engine.inventorySummary());
    }

    @GET
    @Path("/production-yield")
    public Object productionYield(@QueryParam("format") String format) {
        return engine.render(format, ReportEngine.PRODUCTION_YIELD_HEADER, engine.productionYield());
    }

    @GET
    @Path("/expiry-fefo")
    public Object expiryFefo(@QueryParam("format") String format) {
        return engine.render(format, ReportEngine.EXPIRY_FEFO_HEADER, engine.expiryFefo());
    }

    @GET
    @Path("/procurement-spend")
    public Object procurementSpend(@QueryParam("format") String format) {
        return engine.render(format, ReportEngine.PROCUREMENT_SPEND_HEADER, engine.procurementSpend());
    }

    // ============ CUSTOM LEDGER BUILDER (whitelisted) ============

    @GET
    @Path("/ledger")
    public Object ledger(@QueryParam("from") String from, @QueryParam("to") String to,
                         @QueryParam("groupBy") @jakarta.ws.rs.DefaultValue("TYPE") String groupBy,
                         @QueryParam("variantId") Long variantId,
                         @QueryParam("warehouseId") Long warehouseId,
                         @QueryParam("type") String type,
                         @QueryParam("format") String format) {
        return engine.render(format, ReportEngine.LEDGER_HEADER,
                engine.ledger(from, to, groupBy, variantId, warehouseId, type));
    }

    // ============ RUNS ============

    @GET
    @Path("/runs")
    public List<Map<String, Object>> runs() {
        return ReportRun.<ReportRun>streamAll()
                .sorted((a, b) -> b.runAt.compareTo(a.runAt))
                .limit(50)
                .map(r -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", r.id);
                    m.put("reportType", r.reportType);
                    m.put("paramsJson", r.paramsJson);
                    m.put("runAt", r.runAt);
                    m.put("scheduleId", r.schedule != null ? r.schedule.id : null);
                    m.put("scheduleName", r.schedule != null ? r.schedule.name : "manual");
                    return m;
                }).toList();
    }

    @GET
    @Path("/runs/{id}/csv")
    @Produces("text/csv")
    public Response runCsv(@PathParam("id") Long id) {
        ReportRun run = ReportRun.findById(id);
        if (run == null) throw new jakarta.ws.rs.NotFoundException("run not found");
        return Response.ok(run.csvContent != null ? run.csvContent : "")
                .header("Content-Disposition", "attachment; filename=report-" + run.id + ".csv").build();
    }

    @POST
    @Path("/schedules/{id}/run-now")
    @Transactional
    public Response runNow(@PathParam("id") Long id) {
        ReportSchedule schedule = ReportSchedule.findById(id);
        if (schedule == null) throw new jakarta.ws.rs.NotFoundException("schedule not found");
        ReportRun run = new ReportRun();
        run.schedule = schedule;
        run.reportType = schedule.reportType;
        run.paramsJson = schedule.paramsJson;
        run.csvContent = engine.csvFor(schedule.reportType, schedule.paramsJson);
        run.persist();
        LocalDate base = schedule.nextRun != null ? schedule.nextRun : LocalDate.now();
        schedule.nextRun = switch (schedule.frequency) {
            case DAILY -> base.plusDays(1);
            case WEEKLY -> base.plusWeeks(1);
            case MONTHLY -> base.plusMonths(1);
        };
        return Response.ok(Map.of("ran", schedule.name)).build();
    }
}
