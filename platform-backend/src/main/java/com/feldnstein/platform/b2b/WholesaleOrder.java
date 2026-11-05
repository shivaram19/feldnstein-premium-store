package com.feldnstein.platform.b2b;

import com.feldnstein.platform.commerce.shared.DomainException;
import com.feldnstein.platform.gaanugu.catalog.ProductVariant;
import com.feldnstein.platform.gaanugu.inventory.Warehouse;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Wholesale order aggregate root. Owns its lines and enforces the lifecycle:
 * DRAFT → CONFIRMED → DISPATCHED → DELIVERED; CANCELLED from DRAFT/CONFIRMED only.
 * Illegal transitions are rejected here and nowhere else. Totals (in paise) are
 * computed from the lines at placement — never taken from the client whole.
 */
@Entity
@Table(name = "b2b_order")
public class WholesaleOrder extends PanacheEntity {

    public enum Status { DRAFT, CONFIRMED, DISPATCHED, DELIVERED, CANCELLED }

    /** A priced line as handed to {@link #place} — seller-specific unit price. */
    public record LineDraft(ProductVariant variant, int qty, long unitPricePaise, BigDecimal gstPct) {
        public LineDraft {
            if (variant == null) throw new DomainException("variant is required");
            if (qty <= 0) throw new DomainException("quantity must be positive");
            if (unitPricePaise < 0) throw new DomainException("unit price cannot be negative");
            if (gstPct == null || gstPct.signum() < 0) throw new DomainException("gstPct must be zero or positive");
        }
    }

    @Column(name = "order_no", nullable = false, unique = true, length = 32)
    private String orderNo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seller_id", nullable = false)
    private B2bSeller seller;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Status status = Status.DRAFT;

    @Column(name = "order_date", nullable = false)
    private Instant orderDate = Instant.now();

    @Column(name = "dispatch_date") private Instant dispatchDate;
    @Column(name = "delivered_date") private Instant deliveredDate;

    /** Dispatch source warehouse — set at dispatch, null before. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id")
    private Warehouse warehouse;

    @Column(length = 500)
    private String notes;

    @Column(name = "sub_total_paise", nullable = false)
    private long subTotalPaise = 0;

    @Column(name = "gst_total_paise", nullable = false)
    private long gstTotalPaise = 0;

    @Column(name = "grand_total_paise", nullable = false)
    private long grandTotalPaise = 0;

    @Version
    private Long version;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<WholesaleOrderLine> lines = new ArrayList<>();

    protected WholesaleOrder() {}

    /** Factory: places a new DRAFT wholesale order, computing GST totals from the lines. */
    public static WholesaleOrder place(B2bOrderNo no, B2bSeller seller, List<LineDraft> drafts, String notes) {
        if (seller == null) throw new DomainException("seller is required");
        if (drafts == null || drafts.isEmpty()) throw new DomainException("order has no lines");
        WholesaleOrder order = new WholesaleOrder();
        order.orderNo = no.value();
        order.seller = seller;
        order.notes = notes == null || notes.isBlank() ? null : notes.trim();
        long sub = 0;
        long gst = 0;
        for (LineDraft draft : drafts) {
            WholesaleOrderLine line = new WholesaleOrderLine(order, draft);
            order.lines.add(line);
            sub += line.lineTotalPaise();
            gst += line.gstAmountPaise();
        }
        order.subTotalPaise = sub;
        order.gstTotalPaise = gst;
        order.grandTotalPaise = sub + gst;
        return order;
    }

    public static WholesaleOrder findByOrderNo(String orderNo) {
        return find("orderNo", orderNo).firstResult();
    }

    /* ---- lifecycle: the status machine lives here ---- */

    public void confirm(Instant at) {
        require(Status.DRAFT, "confirm");
        status = Status.CONFIRMED;
    }

    public void dispatch(Instant at, Warehouse warehouse) {
        require(Status.CONFIRMED, "dispatch");
        if (warehouse == null) throw new DomainException("a warehouse is required to dispatch");
        status = Status.DISPATCHED;
        dispatchDate = at;
        this.warehouse = warehouse;
    }

    public void deliver(Instant at) {
        require(Status.DISPATCHED, "deliver");
        status = Status.DELIVERED;
        deliveredDate = at;
    }

    public boolean cancellable() {
        return status == Status.DRAFT || status == Status.CONFIRMED;
    }

    public void cancel(Instant at) {
        if (!cancellable())
            throw new DomainException("only DRAFT or CONFIRMED orders can be cancelled (status is " + status + ")");
        status = Status.CANCELLED;
    }

    private void require(Status expected, String action) {
        if (status != expected)
            throw new DomainException("only " + expected + " orders can be " + action + " (status is " + status + ")");
    }

    /* ---- accessors ---- */

    public String orderNo() { return orderNo; }
    public B2bSeller seller() { return seller; }
    public Status status() { return status; }
    public Instant orderDate() { return orderDate; }
    public Instant dispatchDate() { return dispatchDate; }
    public Instant deliveredDate() { return deliveredDate; }
    public Warehouse warehouse() { return warehouse; }
    public String notes() { return notes; }
    public long subTotalPaise() { return subTotalPaise; }
    public long gstTotalPaise() { return gstTotalPaise; }
    public long grandTotalPaise() { return grandTotalPaise; }
    public Long version() { return version; }
    public List<WholesaleOrderLine> lines() { return Collections.unmodifiableList(lines); }
}
