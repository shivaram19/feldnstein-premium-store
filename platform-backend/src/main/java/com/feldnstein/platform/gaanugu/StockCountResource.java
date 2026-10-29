package com.feldnstein.platform.gaanugu;

import io.quarkus.security.identity.SecurityIdentity;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Stock count workflow (ADR-0009): plan → start → count lines → complete (variance)
 * → reconcile (posts adjustment movements to the ledger).
 */
@Path("/g/counts")
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed({"ADMIN", "OPERATOR"})
public class StockCountResource {

    @Inject
    SecurityIdentity identity;

    public record PlanRequest(Long warehouseId, String scopeDesc, LocalDate plannedDate) {}

    public record LineUpdate(Integer countedQty, String countedBy) {}

    @GET
    @Path("/plans")
    public List<Map<String, Object>> plans() {
        return StockCountPlan.<StockCountPlan>listAll().stream()
                .sorted((a, b) -> b.id.compareTo(a.id))
                .map(this::planSummary)
                .toList();
    }

    @POST
    @Path("/plans")
    @Transactional
    @Audited("COUNT_PLAN_CREATE")
    public Response createPlan(PlanRequest req) {
        StockCountPlan plan = new StockCountPlan();
        plan.planCode = "CNT-" + Instant.now().toEpochMilli();
        plan.scopeDesc = req.scopeDesc();
        plan.warehouse = req.warehouseId() != null ? Warehouse.findById(req.warehouseId()) : null;
        plan.plannedDate = req.plannedDate() != null ? req.plannedDate() : LocalDate.now();
        plan.createdBy = currentUser();
        plan.persist();

        List<StockLevel> scope = StockLevel.<StockLevel>streamAll()
                .filter(s -> req.warehouseId() == null || s.warehouse.id.equals(req.warehouseId()))
                .toList();
        for (StockLevel sl : scope) {
            StockCountLine line = new StockCountLine();
            line.plan = plan;
            line.stockLevel = sl;
            line.systemQty = sl.onHand;
            line.persist();
        }
        return Response.ok(Map.of("plan", planSummary(plan), "lines", scope.size())).build();
    }

    @GET
    @Path("/plans/{id}")
    public Map<String, Object> planDetail(@PathParam("id") Long id) {
        StockCountPlan plan = StockCountPlan.findById(id);
        if (plan == null) throw new jakarta.ws.rs.NotFoundException("plan not found");
        Map<String, Object> out = planSummary(plan);
        out.put("lines", StockCountLine.<StockCountLine>stream("plan", plan).map(this::lineView).toList());
        return out;
    }

    @POST
    @Path("/plans/{id}/start")
    @Transactional
    @Audited("COUNT_PLAN_START")
    public Response start(@PathParam("id") Long id) {
        StockCountPlan plan = StockCountPlan.findById(id);
        if (plan == null) throw new jakarta.ws.rs.NotFoundException("plan not found");
        requireStatus(plan, StockCountPlan.CountStatus.PLANNED);
        plan.status = StockCountPlan.CountStatus.IN_PROGRESS;
        return Response.ok(planSummary(plan)).build();
    }

    @PUT
    @Path("/lines/{lineId}")
    @Transactional
    public Response updateLine(@PathParam("lineId") Long lineId, LineUpdate upd) {
        StockCountLine line = StockCountLine.findById(lineId);
        if (line == null) throw new jakarta.ws.rs.NotFoundException("line not found");
        if (line.plan.status != StockCountPlan.CountStatus.IN_PROGRESS)
            return Response.status(409).entity(Map.of("error", "plan is not in progress")).build();
        if (upd.countedQty() != null && upd.countedQty() < 0)
            return Response.status(400).entity(Map.of("error", "countedQty must be >= 0")).build();
        line.countedQty = upd.countedQty();
        line.countedBy = upd.countedBy() != null ? upd.countedBy() : currentUser();
        return Response.ok(lineView(line)).build();
    }

    @POST
    @Path("/plans/{id}/complete")
    @Transactional
    @Audited("COUNT_PLAN_COMPLETE")
    public Response complete(@PathParam("id") Long id) {
        StockCountPlan plan = StockCountPlan.findById(id);
        if (plan == null) throw new jakarta.ws.rs.NotFoundException("plan not found");
        requireStatus(plan, StockCountPlan.CountStatus.IN_PROGRESS);
        boolean anyMissing = StockCountLine.<StockCountLine>stream("plan", plan)
                .anyMatch(l -> l.countedQty == null);
        if (anyMissing)
            return Response.status(409).entity(Map.of("error", "all lines must be counted before completion")).build();
        StockCountLine.<StockCountLine>stream("plan", plan).forEach(l -> l.variance = l.countedQty - l.systemQty);
        plan.status = StockCountPlan.CountStatus.COMPLETED;
        plan.completedAt = Instant.now();
        return Response.ok(planSummary(plan)).build();
    }

    @POST
    @Path("/plans/{id}/reconcile")
    @Transactional
    @Audited("COUNT_PLAN_RECONCILE")
    public Response reconcile(@PathParam("id") Long id) {
        StockCountPlan plan = StockCountPlan.findById(id);
        if (plan == null) throw new jakarta.ws.rs.NotFoundException("plan not found");
        requireStatus(plan, StockCountPlan.CountStatus.COMPLETED);
        int adjusted = 0;
        for (StockCountLine line : StockCountLine.<StockCountLine>list("plan", plan)) {
            if (line.variance == null || line.variance == 0) continue;
            StockLevel sl = line.stockLevel;
            sl.onHand += line.variance;
            StockMovement m = new StockMovement();
            m.movementNo = "ADJ-CNT-" + plan.planCode + "-" + line.id;
            m.type = line.variance < 0 ? StockMovement.MovementType.ADJUSTMENT_OUT : StockMovement.MovementType.ADJUSTMENT_IN;
            m.variant = sl.variant;
            m.batch = sl.batch;
            m.fromWarehouse = sl.warehouse;
            m.quantity = Math.abs(line.variance);
            m.unitCost = sl.unitCost;
            m.referenceType = "ADJUSTMENT";
            m.referenceId = "COUNT:" + plan.planCode;
            m.reason = "Stock count reconciliation (counted " + line.countedQty + " vs system " + line.systemQty + ")";
            m.performedBy = currentUser();
            m.persist();
            adjusted++;
        }
        plan.status = StockCountPlan.CountStatus.RECONCILED;
        return Response.ok(Map.of("plan", planSummary(plan), "adjustmentsPosted", adjusted)).build();
    }

    // ============ helpers ============

    private void requireStatus(StockCountPlan plan, StockCountPlan.CountStatus expected) {
        if (plan.status != expected)
            throw new jakarta.ws.rs.ClientErrorException("plan status is " + plan.status + ", expected " + expected,
                    jakarta.ws.rs.core.Response.Status.CONFLICT);
    }

    private Map<String, Object> planSummary(StockCountPlan p) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", p.id);
        m.put("planCode", p.planCode);
        m.put("scopeDesc", p.scopeDesc);
        m.put("warehouse", p.warehouse != null ? p.warehouse.name : null);
        m.put("warehouseId", p.warehouse != null ? p.warehouse.id : null);
        m.put("status", p.status.name());
        m.put("createdBy", p.createdBy);
        m.put("plannedDate", p.plannedDate);
        m.put("completedAt", p.completedAt);
        long lines = StockCountLine.count("plan", p);
        long varianceLines = StockCountLine.<StockCountLine>stream("plan", p)
                .filter(l -> l.variance != null && l.variance != 0).count();
        m.put("lineCount", lines);
        m.put("varianceCount", varianceLines);
        return m;
    }

    private Map<String, Object> lineView(StockCountLine l) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", l.id);
        m.put("sku", l.stockLevel.variant.sku);
        m.put("product", l.stockLevel.variant.product != null ? l.stockLevel.variant.product.name : null);
        m.put("batchCode", l.stockLevel.batch != null ? l.stockLevel.batch.batchCode : null);
        m.put("warehouse", l.stockLevel.warehouse.name);
        m.put("systemQty", l.systemQty);
        m.put("countedQty", l.countedQty);
        m.put("variance", l.variance);
        m.put("countedBy", l.countedBy);
        m.put("stockLevelId", l.stockLevel.id);
        return m;
    }

    private String currentUser() {
        return identity == null || identity.isAnonymous() ? "system" : identity.getPrincipal().getName();
    }
}
