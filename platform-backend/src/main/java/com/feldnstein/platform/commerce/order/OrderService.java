package com.feldnstein.platform.commerce.order;

import com.feldnstein.platform.commerce.cart.Cart;
import com.feldnstein.platform.commerce.payment.Payment;
import com.feldnstein.platform.commerce.payment.PaymentService;
import com.feldnstein.platform.gaanugu.catalog.ProductVariant;
import com.feldnstein.platform.gaanugu.inventory.StockLevel;
import com.feldnstein.platform.gaanugu.inventory.StockMovement;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Order lifecycle + stock integration. Reservations, deductions and releases all
 * walk a variant's stock positions in the same deterministic FEFO order, so the
 * positions touched at checkout are exactly the ones released or deducted later.
 */
@ApplicationScoped
public class OrderService {

    @Inject PaymentService payments;

    public record CheckoutForm(String customerName, String email, String phone,
                               String address, String city, String state, String pincode) {}

    /** Turns a cart into a PENDING order: validates availability, reserves stock, starts payment. */
    @Transactional
    public Map<String, Object> checkout(Cart cart, CheckoutForm f) {
        if (cart.items.isEmpty()) return Map.of("error", "cart is empty");
        String invalid = validate(f);
        if (invalid != null) return Map.of("error", invalid);

        for (var item : cart.items) {
            long sellable = sellable(item.variant);
            if (item.qty > sellable)
                return Map.of("error", "only " + sellable + " units available for " + item.variant.sku);
        }

        CustomerOrder order = new CustomerOrder();
        order.orderCode = nextOrderCode();
        order.customerName = f.customerName().trim();
        order.email = f.email().trim();
        order.phone = f.phone().trim();
        order.address = f.address().trim();
        order.city = f.city().trim();
        order.state = f.state().trim();
        order.pincode = f.pincode().trim();

        for (var item : cart.items) {
            OrderLine line = new OrderLine();
            line.order = order;
            line.variant = item.variant;
            line.qty = item.qty;
            line.unitPrice = item.unitPrice;
            line.gstPct = item.gstPct;
            line.lineTotal = item.lineTotal();
            order.lines.add(line);
            order.subTotal = order.subTotal.add(line.lineTotal);
            order.gstTotal = order.gstTotal.add(line.lineTotal.multiply(line.gstPct)
                    .divide(BigDecimal.valueOf(100)));
        }
        order.grandTotal = order.subTotal.add(order.gstTotal);
        order.persist();

        reserve(order);
        Payment payment = payments.initiate(order);
        cart.delete();

        Map<String, Object> out = view(order);
        out.put("payment", payments.view(payment));
        out.put("demoPayment", payments.demoMode());
        return out;
    }

    private static String validate(CheckoutForm f) {
        if (f == null) return "checkout details are required";
        if (blank(f.customerName()) || f.customerName().trim().length() < 2) return "name is required";
        if (blank(f.email()) || !f.email().contains("@")) return "a valid email is required";
        if (blank(f.phone()) || f.phone().replaceAll("[^0-9]", "").length() < 10) return "a valid 10-digit phone is required";
        if (blank(f.address())) return "address is required";
        if (blank(f.city())) return "city is required";
        if (blank(f.state())) return "state is required";
        if (blank(f.pincode()) || !f.pincode().matches("^[0-9]{6}$")) return "a valid 6-digit pincode is required";
        return null;
    }

    private static boolean blank(String s) { return s == null || s.isBlank(); }

    private static String nextOrderCode() {
        return "ORD-" + Instant.now().toEpochMilli() + ThreadLocalRandom.current().nextInt(100);
    }

    /* ---- stock: FEFO across a variant's positions (null expiry last) ---- */

    private static List<StockLevel> fefoPositions(ProductVariant variant) {
        return StockLevel.<StockLevel>streamAll()
                .filter(s -> s.variant != null && s.variant.id.equals(variant.id))
                .sorted(Comparator.comparing(s -> s.expiryDate == null ? LocalDate.of(9999, 12, 31) : s.expiryDate))
                .toList();
    }

    private static long sellable(ProductVariant variant) {
        return fefoPositions(variant).stream().mapToLong(StockLevel::getAvailable).sum();
    }

    private void reserve(CustomerOrder order) {
        for (OrderLine line : order.lines) {
            int remaining = line.qty;
            for (StockLevel sl : fefoPositions(line.variant)) {
                if (remaining == 0) break;
                int take = Math.min(remaining, sl.getAvailable());
                if (take > 0) { sl.reserved += take; remaining -= take; }
            }
        }
    }

    private void release(CustomerOrder order) {
        for (OrderLine line : order.lines) {
            int remaining = line.qty;
            for (StockLevel sl : fefoPositions(line.variant)) {
                if (remaining == 0) break;
                int take = Math.min(remaining, sl.reserved);
                if (take > 0) { sl.reserved -= take; remaining -= take; }
            }
        }
    }

    /** Ship: consume the reservation (onHand −= qty, reserved −= qty) and write the ledger entry. */
    private void deductOnShip(CustomerOrder order) {
        for (OrderLine line : order.lines) {
            int remaining = line.qty;
            for (StockLevel sl : fefoPositions(line.variant)) {
                if (remaining == 0) break;
                int take = Math.min(remaining, sl.reserved);
                if (take <= 0) continue;
                sl.onHand -= take;
                sl.reserved -= take;
                remaining -= take;
                writeOrderMovement(sl, take, order.orderCode);
            }
        }
    }

    private void writeOrderMovement(StockLevel sl, int qty, String orderCode) {
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

    /* ---- admin lifecycle ---- */

    public record ActionResult(boolean ok, String message) {}

    @Transactional
    public ActionResult confirm(CustomerOrder order) {
        if (order.status != CustomerOrder.Status.PAID)
            return new ActionResult(false, "only PAID orders can be confirmed (status is " + order.status + ")");
        order.status = CustomerOrder.Status.CONFIRMED;
        order.confirmedAt = Instant.now();
        return new ActionResult(true, "confirmed");
    }

    @Transactional
    public ActionResult ship(CustomerOrder order) {
        if (order.status != CustomerOrder.Status.CONFIRMED)
            return new ActionResult(false, "only CONFIRMED orders can be shipped (status is " + order.status + ")");
        deductOnShip(order);
        order.status = CustomerOrder.Status.SHIPPED;
        order.shippedAt = Instant.now();
        return new ActionResult(true, "shipped");
    }

    @Transactional
    public ActionResult deliver(CustomerOrder order) {
        if (order.status != CustomerOrder.Status.SHIPPED)
            return new ActionResult(false, "only SHIPPED orders can be delivered (status is " + order.status + ")");
        order.status = CustomerOrder.Status.DELIVERED;
        order.deliveredAt = Instant.now();
        return new ActionResult(true, "delivered");
    }

    @Transactional
    public ActionResult cancel(CustomerOrder order, String reason) {
        if (order.status != CustomerOrder.Status.PENDING
                && order.status != CustomerOrder.Status.PAID
                && order.status != CustomerOrder.Status.CONFIRMED)
            return new ActionResult(false, "order can no longer be cancelled (status is " + order.status + ")");
        release(order);
        if (order.status == CustomerOrder.Status.PAID || order.status == CustomerOrder.Status.CONFIRMED)
            payments.refund(order);
        order.status = CustomerOrder.Status.CANCELLED;
        order.cancelledAt = Instant.now();
        order.cancelReason = reason == null || reason.isBlank() ? "cancelled by admin" : reason.trim();
        return new ActionResult(true, "cancelled");
    }

    /* ---- views ---- */

    public Map<String, Object> view(CustomerOrder o) {
        Map<String, Object> m = new LinkedHashMap<String, Object>();
        m.put("orderCode", o.orderCode);
        m.put("status", o.status.name());
        m.put("customerName", o.customerName);
        m.put("email", o.email);
        m.put("phone", o.phone);
        m.put("address", o.address + ", " + o.city + ", " + o.state + " - " + o.pincode);
        m.put("subTotal", o.subTotal);
        m.put("gstTotal", o.gstTotal);
        m.put("grandTotal", o.grandTotal);
        m.put("createdAt", o.createdAt.toString());
        m.put("lines", o.lines.stream().map(l -> {
            Map<String, Object> line = new LinkedHashMap<String, Object>();
            line.put("variantId", l.variant.id);
            line.put("sku", l.variant.sku);
            line.put("product", l.variant.product != null ? l.variant.product.name : "");
            line.put("sizeMl", l.variant.sizeMl);
            line.put("qty", l.qty);
            line.put("unitPrice", l.unitPrice);
            line.put("gstPct", l.gstPct);
            line.put("lineTotal", l.lineTotal);
            return line;
        }).toList());
        m.put("payment", payments.view(Payment.findByOrder(o)));
        Map<String, String> timeline = new LinkedHashMap<String, String>();
        timeline.put("PENDING", o.createdAt.toString());
        if (o.paidAt != null) timeline.put("PAID", o.paidAt.toString());
        if (o.confirmedAt != null) timeline.put("CONFIRMED", o.confirmedAt.toString());
        if (o.shippedAt != null) timeline.put("SHIPPED", o.shippedAt.toString());
        if (o.deliveredAt != null) timeline.put("DELIVERED", o.deliveredAt.toString());
        if (o.cancelledAt != null) timeline.put("CANCELLED", o.cancelledAt.toString());
        m.put("timeline", timeline);
        if (o.cancelReason != null) m.put("cancelReason", o.cancelReason);
        return m;
    }
}
