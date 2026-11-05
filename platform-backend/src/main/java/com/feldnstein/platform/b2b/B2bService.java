package com.feldnstein.platform.b2b;

import com.feldnstein.platform.commerce.shared.DomainException;
import com.feldnstein.platform.gaanugu.catalog.ProductVariant;
import com.feldnstein.platform.gaanugu.inventory.StockLevel;
import com.feldnstein.platform.gaanugu.inventory.StockMovement;
import com.feldnstein.platform.gaanugu.inventory.Warehouse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

/**
 * B2B wholesale application service — the admin use cases: place an order with
 * seller-specific pricing (totals computed here), advance the lifecycle, and
 * deduct FEFO stock at dispatch. Dispatch walks the source warehouse's sellable
 * positions per line and fails closed: an uncovered line throws, and the
 * transaction rolls back every decrement taken before it.
 */
@ApplicationScoped
public class B2bService {

    /** A line as the client sends it — the service resolves the variant. */
    public record LineSpec(Long variantId, int qty, long unitPricePaise, BigDecimal gstPct) {}

    @Transactional
    public WholesaleOrder create(Long sellerId, List<LineSpec> specs, String notes) {
        B2bSeller seller = B2bSeller.findById(sellerId);
        if (seller == null) throw new DomainException("seller not found");
        if (specs == null || specs.isEmpty()) throw new DomainException("order has no lines");
        List<WholesaleOrder.LineDraft> drafts = specs.stream().map(spec -> {
            ProductVariant variant = ProductVariant.findById(spec.variantId());
            if (variant == null) throw new DomainException("variant " + spec.variantId() + " not found");
            return new WholesaleOrder.LineDraft(variant, spec.qty(), spec.unitPricePaise(), spec.gstPct());
        }).toList();
        WholesaleOrder order = WholesaleOrder.place(B2bOrderNo.fresh(), seller, drafts, notes);
        order.persist();
        return order;
    }

    @Transactional
    public WholesaleOrder advance(Long orderId, WholesaleOrder.Status target, Long warehouseId) {
        WholesaleOrder order = WholesaleOrder.findById(orderId);
        if (order == null) throw new DomainException("order not found");
        Instant now = Instant.now();
        switch (target) {
            case CONFIRMED -> order.confirm(now);
            case DISPATCHED -> {
                Warehouse warehouse = warehouseId == null ? null : Warehouse.findById(warehouseId);
                if (warehouse == null)
                    throw new DomainException("a valid warehouseId is required to dispatch");
                deductStock(order, warehouse);
                order.dispatch(now, warehouse);
            }
            case DELIVERED -> order.deliver(now);
            case CANCELLED -> order.cancel(now);
            default -> throw new DomainException("orders cannot move back to DRAFT");
        }
        return order;
    }

    private void deductStock(WholesaleOrder order, Warehouse warehouse) {
        for (WholesaleOrderLine line : order.lines()) {
            int remaining = line.qty();
            for (StockLevel sl : positions(line.variant(), warehouse)) {
                if (remaining == 0) break;
                int take = Math.min(remaining, sl.getAvailable());
                if (take > 0) {
                    sl.onHand -= take;
                    remaining -= take;
                    writeLedger(sl, take, order.orderNo());
                }
            }
            if (remaining > 0)
                throw new DomainException("insufficient stock for " + line.variant().sku
                        + " at warehouse " + warehouse.code + ": " + remaining + " units short");
        }
    }

    /** Sellable positions of a variant at one warehouse, FEFO (earliest expiry first, un-dated last). */
    private static List<StockLevel> positions(ProductVariant variant, Warehouse warehouse) {
        return StockLevel.<StockLevel>streamAll()
                .filter(s -> s.warehouse != null && s.warehouse.id.equals(warehouse.id))
                .filter(s -> s.variant != null && s.variant.id.equals(variant.id))
                .sorted(Comparator.comparing(s -> s.expiryDate == null
                        ? LocalDate.of(9999, 12, 31) : s.expiryDate))
                .toList();
    }

    private void writeLedger(StockLevel sl, int qty, String orderNo) {
        StockMovement m = new StockMovement();
        m.movementNo = "B2B-OUT-" + Instant.now().toEpochMilli() + "-" + ThreadLocalRandom.current().nextInt(1000);
        m.type = StockMovement.MovementType.WHOLESALE_OUT;
        m.variant = sl.variant;
        m.batch = sl.batch;
        m.fromWarehouse = sl.warehouse;
        m.quantity = qty;
        m.unitCost = sl.unitCost != null ? sl.unitCost : BigDecimal.ZERO;
        m.referenceType = "B2B_ORDER";
        m.referenceId = orderNo;
        m.reason = "Wholesale dispatch";
        m.performedBy = "b2b";
        m.persist();
    }
}
