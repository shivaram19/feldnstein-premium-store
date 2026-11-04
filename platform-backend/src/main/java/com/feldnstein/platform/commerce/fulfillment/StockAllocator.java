package com.feldnstein.platform.commerce.fulfillment;

import com.feldnstein.platform.commerce.order.CustomerOrder;
import com.feldnstein.platform.commerce.order.OrderAllocation;
import com.feldnstein.platform.commerce.order.OrderLine;
import com.feldnstein.platform.gaanugu.catalog.ProductVariant;
import com.feldnstein.platform.gaanugu.inventory.StockLevel;
import com.feldnstein.platform.gaanugu.inventory.StockMovement;
import jakarta.enterprise.context.ApplicationScoped;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Stock allocation domain service — the anti-corruption layer between Sales and
 * Inventory. Reserving walks a variant's stock positions FEFO (earliest expiry
 * first, un-dated last) and records the exact slices on the order; release
 * (cancel) and deduct (ship) replay those recorded positions, never a
 * re-computed walk. Deducting also writes ORDER_OUT ledger entries.
 */
@ApplicationScoped
public class StockAllocator {

    /** Sellable units (on-hand − reserved − on-hold) across all positions of a variant. */
    public long sellableUnits(ProductVariant variant) {
        return positions(variant).stream().mapToLong(StockLevel::getAvailable).sum();
    }

    /** Reserves the order's lines FEFO and returns the recorded allocation slices. */
    public List<OrderAllocation> reserve(CustomerOrder order) {
        List<OrderAllocation> slices = new ArrayList<>();
        for (OrderLine line : order.lines()) {
            int remaining = line.qty();
            for (StockLevel sl : positions(line.variant())) {
                if (remaining == 0) break;
                int take = Math.min(remaining, sl.getAvailable());
                if (take > 0) {
                    sl.reserved += take;
                    remaining -= take;
                    slices.add(OrderAllocation.of(order, sl, take));
                }
            }
        }
        return slices;
    }

    public void release(CustomerOrder order) {
        if (order.allocations().isEmpty()) { releaseLegacyFefo(order); return; }
        for (OrderAllocation a : order.allocations()) {
            StockLevel sl = a.stockLevel();
            int take = Math.min(a.qty(), sl.reserved);
            if (take > 0) sl.reserved -= take;
        }
    }

    /** Pre-allocation orders (created before the allocation record existed). */
    private void releaseLegacyFefo(CustomerOrder order) {
        for (OrderLine line : order.lines()) {
            int remaining = line.qty();
            for (StockLevel sl : positions(line.variant())) {
                if (remaining == 0) break;
                int take = Math.min(remaining, sl.reserved);
                if (take > 0) { sl.reserved -= take; remaining -= take; }
            }
        }
    }

    /** Consume the reservation: on-hand −= qty, reserved −= qty, ledger ORDER_OUT per
     *  slice. The allocations are then spent — release/deduct afterwards must find none. */
    public void deduct(CustomerOrder order) {
        for (OrderAllocation a : order.allocations()) {
            StockLevel sl = a.stockLevel();
            int take = Math.min(a.qty(), sl.reserved);
            if (take <= 0) continue;
            sl.onHand -= take;
            sl.reserved -= take;
            writeLedger(sl, take, order.orderCode());
        }
        order.recordAllocations(java.util.List.of());
    }

    public long sellableForVariantId(Long variantId) {
        ProductVariant variant = ProductVariant.findById(variantId);
        return variant == null ? 0 : sellableUnits(variant);
    }

    private static List<StockLevel> positions(ProductVariant variant) {
        return StockLevel.<StockLevel>streamAll()
                .filter(s -> s.variant != null && s.variant.id.equals(variant.id))
                .sorted(Comparator.comparing(s -> s.expiryDate == null
                        ? LocalDate.of(9999, 12, 31) : s.expiryDate))
                .toList();
    }

    private void writeLedger(StockLevel sl, int qty, String orderCode) {
        StockMovement m = new StockMovement();
        m.movementNo = "ORDER-" + Instant.now().toEpochMilli() + "-" + ThreadLocalRandom.current().nextInt(1000);
        m.type = StockMovement.MovementType.ORDER_OUT;
        m.variant = sl.variant;
        m.batch = sl.batch;
        m.fromWarehouse = sl.warehouse;
        m.quantity = qty;
        m.unitCost = sl.unitCost != null ? sl.unitCost : BigDecimal.ZERO;
        m.referenceType = "ORDER";
        m.referenceId = orderCode;
        m.reason = "Order shipped";
        m.performedBy = "commerce";
        m.persist();
    }
}
