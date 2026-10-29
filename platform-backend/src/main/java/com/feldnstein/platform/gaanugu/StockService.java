package com.feldnstein.platform.gaanugu;

import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;

/**
 * Stock mutations that keep the ledger and stock_levels consistent (spec cross-cutting).
 * Every endpoint is transactional and audited (ADR-0010).
 */
@Path("/g/stock")
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed({"ADMIN", "OPERATOR"})
public class StockService {

    // ============ TRANSFER ============

    public record TransferRequest(Long stockLevelId, Long toWarehouseId, int quantity, String reason) {}

    @POST
    @Path("/transfers")
    @Transactional
    @Audited("STOCK_TRANSFER")
    public Response transfer(TransferRequest req) {
        StockLevel from = StockLevel.findById(req.stockLevelId());
        if (from == null) return Response.status(404).entity(Map.of("error", "stock level not found")).build();
        Warehouse toWh = Warehouse.findById(req.toWarehouseId());
        if (toWh == null) return Response.status(404).entity(Map.of("error", "warehouse not found")).build();
        if (req.quantity() <= 0) return Response.status(400).entity(Map.of("error", "quantity must be positive")).build();
        if (from.getAvailable() < req.quantity())
            return Response.status(400).entity(Map.of("error", "insufficient available stock: " + from.getAvailable())).build();

        String transferNo = "TRF-" + Instant.now().toEpochMilli();
        from.onHand -= req.quantity();

        StockLevel to = StockLevel.<StockLevel>streamAll()
                .filter(s -> s.variant.id.equals(from.variant.id)
                        && ((s.batch == null && from.batch == null) || (s.batch != null && from.batch != null && s.batch.id.equals(from.batch.id)))
                        && s.warehouse.id.equals(toWh.id))
                .findFirst()
                .orElse(null);
        if (to == null) {
            to = new StockLevel();
            to.variant = from.variant;
            to.batch = from.batch;
            to.warehouse = toWh;
            to.unitCost = from.unitCost;
            to.expiryDate = from.expiryDate;
            to.persist();
        }
        to.onHand += req.quantity();

        writeMovement(StockMovement.MovementType.TRANSFER_OUT, from, from.warehouse, toWh, req.quantity(), transferNo);
        writeMovement(StockMovement.MovementType.TRANSFER_IN, to, from.warehouse, toWh, req.quantity(), transferNo);
        return Response.ok(Map.of("transferNo", transferNo, "moved", req.quantity())).build();
    }

    // ============ ADJUSTMENT ============

    public record AdjustmentRequest(Long stockLevelId, int adjustedQty, String type, String reason) {}

    @POST
    @Path("/adjustments")
    @Transactional
    @Audited("STOCK_ADJUSTMENT")
    public Response adjust(AdjustmentRequest req) {
        StockLevel sl = StockLevel.findById(req.stockLevelId());
        if (sl == null) return Response.status(404).entity(Map.of("error", "stock level not found")).build();
        if (req.adjustedQty() < 0) return Response.status(400).entity(Map.of("error", "adjustedQty must be >= 0")).build();
        int delta = req.adjustedQty() - sl.onHand;
        if (delta == 0) return Response.ok(Map.of("delta", 0)).build();
        sl.onHand = req.adjustedQty();
        var type = delta < 0 ? StockMovement.MovementType.ADJUSTMENT_OUT : StockMovement.MovementType.ADJUSTMENT_IN;
        writeMovement(type, sl, sl.warehouse, null, Math.abs(delta), "ADJ-" + Instant.now().toEpochMilli(),
                (req.type() != null ? req.type() + ": " : "") + (req.reason() != null ? req.reason() : ""));
        return Response.ok(Map.of("delta", delta, "onHand", sl.onHand)).build();
    }

    // ============ HOLD & RELEASE ============

    public record HoldRequest(Long stockLevelId, int quantity) {}

    @POST
    @Path("/hold")
    @Transactional
    @Audited("STOCK_HOLD")
    public Response hold(HoldRequest req) {
        StockLevel sl = StockLevel.findById(req.stockLevelId());
        if (sl == null) return Response.status(404).entity(Map.of("error", "stock level not found")).build();
        if (req.quantity() <= 0 || req.quantity() > sl.getAvailable())
            return Response.status(400).entity(Map.of("error", "invalid hold quantity; available " + sl.getAvailable())).build();
        sl.onHold += req.quantity();
        return Response.ok(Map.of("onHold", sl.onHold, "available", sl.getAvailable())).build();
    }

    @POST
    @Path("/release")
    @Transactional
    @Audited("STOCK_RELEASE")
    public Response release(HoldRequest req) {
        StockLevel sl = StockLevel.findById(req.stockLevelId());
        if (sl == null) return Response.status(404).entity(Map.of("error", "stock level not found")).build();
        if (req.quantity() <= 0 || req.quantity() > sl.onHold)
            return Response.status(400).entity(Map.of("error", "invalid release quantity; on hold " + sl.onHold)).build();
        sl.onHold -= req.quantity();
        return Response.ok(Map.of("onHold", sl.onHold, "available", sl.getAvailable())).build();
    }

    // ============ HELPERS ============

    private void writeMovement(StockMovement.MovementType type, StockLevel sl, Warehouse from, Warehouse to,
                               int qty, String refId) {
        writeMovement(type, sl, from, to, qty, refId, null);
    }

    private void writeMovement(StockMovement.MovementType type, StockLevel sl, Warehouse from, Warehouse to,
                               int qty, String refId, String reason) {
        StockMovement m = new StockMovement();
        m.movementNo = type.name() + "-" + Instant.now().toEpochMilli() + "-" + (int) (Math.random() * 1000);
        m.type = type;
        m.variant = sl.variant;
        m.batch = sl.batch;
        m.fromWarehouse = from;
        m.toWarehouse = to;
        m.quantity = qty;
        m.unitCost = sl.unitCost != null ? sl.unitCost : BigDecimal.ZERO;
        m.referenceType = type.name().startsWith("TRANSFER") ? "TRANSFER"
                : type.name().startsWith("ADJUSTMENT") ? "ADJUSTMENT" : null;
        m.referenceId = refId;
        m.reason = reason;
        m.persist();
    }
}
