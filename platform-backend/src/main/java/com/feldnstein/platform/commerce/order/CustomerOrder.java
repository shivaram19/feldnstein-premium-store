package com.feldnstein.platform.commerce.order;

import com.feldnstein.platform.commerce.shared.CartTotals;
import com.feldnstein.platform.commerce.shared.DeliveryAddress;
import com.feldnstein.platform.commerce.shared.DomainException;
import com.feldnstein.platform.commerce.shared.EmailAddress;
import com.feldnstein.platform.commerce.shared.GstRate;
import com.feldnstein.platform.commerce.shared.Money;
import com.feldnstein.platform.commerce.shared.OrderNo;
import com.feldnstein.platform.commerce.shared.Quantity;
import com.feldnstein.platform.gaanugu.catalog.ProductVariant;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Order aggregate root. Owns its lines and enforces the lifecycle:
 * PENDING → PAID → CONFIRMED → SHIPPED → DELIVERED; CANCELLED from
 * PENDING/PAID/CONFIRMED. Illegal transitions are rejected here and nowhere else.
 */
@Entity
@Table(name = "customer_order")
public class CustomerOrder extends PanacheEntity {

    public enum Status { PENDING, PAID, CONFIRMED, SHIPPED, DELIVERED, CANCELLED }

    /** A priced line as handed to {@link #place} — the factory turns it into an OrderLine. */
    public record LineDraft(ProductVariant variant, Quantity qty, Money unitPrice, GstRate gstRate) {
        public LineDraft {
            if (variant == null) throw new DomainException("variant is required");
            if (qty == null || qty.isZero()) throw new DomainException("quantity must be positive");
        }
    }

    @Column(name = "order_code", nullable = false, unique = true, length = 24)
    private String orderCode;

    @Column(name = "customer_name", nullable = false, length = 128)
    private String customerName;

    @Column(nullable = false, length = 128)
    private String email;

    @Column(nullable = false, length = 32)
    private String phone;

    @Column(nullable = false, length = 255)
    private String address;

    @Column(nullable = false, length = 64)
    private String city;

    @Column(nullable = false, length = 64)
    private String state;

    @Column(nullable = false, length = 12)
    private String pincode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Status status = Status.PENDING;

    @Column(name = "sub_total", nullable = false, precision = 12, scale = 2)
    private BigDecimal subTotal = BigDecimal.ZERO;

    @Column(name = "gst_total", nullable = false, precision = 12, scale = 2)
    private BigDecimal gstTotal = BigDecimal.ZERO;

    @Column(name = "grand_total", nullable = false, precision = 12, scale = 2)
    private BigDecimal grandTotal = BigDecimal.ZERO;

    /** Loyalty points redeemed against this order (post-GST discount, 1 point = ₹1). */
    @Column(name = "points_redeemed")
    private Integer pointsRedeemed;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "paid_at") private Instant paidAt;
    @Column(name = "confirmed_at") private Instant confirmedAt;
    @Column(name = "shipped_at") private Instant shippedAt;
    @Column(name = "delivered_at") private Instant deliveredAt;
    @Column(name = "cancelled_at") private Instant cancelledAt;
    @Column(name = "cancel_reason", length = 500) private String cancelReason;

    @Version
    private Long version;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<OrderLine> lines = new ArrayList<>();

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<OrderAllocation> allocations = new ArrayList<>();

    protected CustomerOrder() {}

    /** Factory: places a new PENDING order from priced lines, computing totals from the lines. */
    public static CustomerOrder place(OrderNo no, String customerName, EmailAddress email, String phone,
                                      DeliveryAddress delivery, List<LineDraft> drafts) {
        if (customerName == null || customerName.trim().length() < 2)
            throw new DomainException("name is required");
        if (drafts == null || drafts.isEmpty()) throw new DomainException("order has no lines");
        CustomerOrder order = new CustomerOrder();
        order.orderCode = no.value();
        order.customerName = customerName.trim();
        order.email = email.value().trim();
        order.phone = phone == null ? "" : phone.trim();
        order.address = delivery.addressLine();
        order.city = delivery.city();
        order.state = delivery.state();
        order.pincode = delivery.pincode();
        Money sub = Money.ZERO;
        Money gst = Money.ZERO;
        for (LineDraft draft : drafts) {
            OrderLine line = new OrderLine(order, draft.variant(), draft.qty(), draft.unitPrice(), draft.gstRate());
            order.lines.add(line);
            sub = sub.plus(line.lineTotal());
            gst = gst.plus(line.gstAmount());
        }
        order.subTotal = sub.amount();
        order.gstTotal = gst.amount();
        order.grandTotal = sub.plus(gst).amount();
        return order;
    }

    public static CustomerOrder findByCode(String code) {
        return find("orderCode", code).firstResult();
    }

    /* ---- lifecycle: the status machine lives here ---- */

    public void markPaid(Instant at) {
        require(Status.PENDING, "mark as paid");
        status = Status.PAID;
        paidAt = at;
    }

    public void confirm(Instant at) {
        require(Status.PAID, "confirm");
        status = Status.CONFIRMED;
        confirmedAt = at;
    }

    public void ship(Instant at) {
        require(Status.CONFIRMED, "ship");
        status = Status.SHIPPED;
        shippedAt = at;
    }

    public void deliver(Instant at) {
        require(Status.SHIPPED, "deliver");
        status = Status.DELIVERED;
        deliveredAt = at;
    }

    public boolean cancellable() {
        return status == Status.PENDING || status == Status.PAID || status == Status.CONFIRMED;
    }

    public void cancel(Instant at, String reason) {
        if (!cancellable()) throw new DomainException("order can no longer be cancelled (status is " + status + ")");
        status = Status.CANCELLED;
        cancelledAt = at;
        cancelReason = reason == null || reason.isBlank() ? "cancelled by admin" : reason.trim();
    }

    private void require(Status expected, String action) {
        if (status != expected)
            throw new DomainException("only " + expected + " orders can be " + action + " (status is " + status + ")");
    }

    /** Applies a loyalty redemption: 1 point = ₹1 off the grand total (post-GST, GST
     *  untouched), capped at the whole rupees the total affords. Returns the points used. */
    public int applyRedemption(int pointsRequested) {
        if (pointsRequested <= 0) throw new DomainException("points to redeem must be positive");
        int affordable = grandTotal.setScale(0, java.math.RoundingMode.FLOOR).intValue();
        int used = Math.min(pointsRequested, affordable);
        if (used <= 0) throw new DomainException("order total is too low to redeem points");
        grandTotal = grandTotal.subtract(Money.of(used).amount());
        pointsRedeemed = pointsRedeemed() + used;
        return used;
    }

    /* ---- accessors ---- */

    public String orderCode() { return orderCode; }
    public Status status() { return status; }
    public String customerName() { return customerName; }
    public String email() { return email; }
    public String phone() { return phone; }
    public DeliveryAddress deliveryAddress() {
        return new DeliveryAddress(address, city, state, pincode);
    }
    public Money subTotal() { return Money.of(subTotal); }
    public Money gstTotal() { return Money.of(gstTotal); }
    public Money grandTotal() { return Money.of(grandTotal); }
    public int pointsRedeemed() { return pointsRedeemed == null ? 0 : pointsRedeemed; }
    public CartTotals totals() {
        return new CartTotals(subTotal(), gstTotal(), grandTotal(), lines.stream().mapToInt(OrderLine::qty).sum());
    }
    public Instant createdAt() { return createdAt; }
    public Instant paidAt() { return paidAt; }
    public Instant confirmedAt() { return confirmedAt; }
    public Instant shippedAt() { return shippedAt; }
    public Instant deliveredAt() { return deliveredAt; }
    public Instant cancelledAt() { return cancelledAt; }
    public String cancelReason() { return cancelReason; }
    public Long version() { return version; }
    public List<OrderLine> lines() { return Collections.unmodifiableList(lines); }

    /** Where this order's stock is reserved — recorded at checkout, replayed on release/deduct. */
    public List<OrderAllocation> allocations() { return Collections.unmodifiableList(allocations); }

    public void recordAllocations(List<OrderAllocation> reserved) {
        allocations.clear();
        allocations.addAll(reserved);
    }
}
