package com.feldnstein.platform.commerce.order;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "customer_order")
public class CustomerOrder extends PanacheEntity {

    public enum Status { PENDING, PAID, CONFIRMED, SHIPPED, DELIVERED, CANCELLED }

    @Column(name = "order_code", nullable = false, unique = true, length = 24)
    public String orderCode;

    @Column(name = "customer_name", nullable = false, length = 128)
    public String customerName;

    @Column(nullable = false, length = 128)
    public String email;

    @Column(nullable = false, length = 32)
    public String phone;

    @Column(nullable = false, length = 255)
    public String address;

    @Column(nullable = false, length = 64)
    public String city;

    @Column(nullable = false, length = 64)
    public String state;

    @Column(nullable = false, length = 12)
    public String pincode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    public Status status = Status.PENDING;

    @Column(name = "sub_total", nullable = false, precision = 12, scale = 2)
    public BigDecimal subTotal = BigDecimal.ZERO;

    @Column(name = "gst_total", nullable = false, precision = 12, scale = 2)
    public BigDecimal gstTotal = BigDecimal.ZERO;

    @Column(name = "grand_total", nullable = false, precision = 12, scale = 2)
    public BigDecimal grandTotal = BigDecimal.ZERO;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt = Instant.now();

    @Column(name = "paid_at") public Instant paidAt;
    @Column(name = "confirmed_at") public Instant confirmedAt;
    @Column(name = "shipped_at") public Instant shippedAt;
    @Column(name = "delivered_at") public Instant deliveredAt;
    @Column(name = "cancelled_at") public Instant cancelledAt;
    @Column(name = "cancel_reason", length = 500) public String cancelReason;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    public List<OrderLine> lines = new ArrayList<>();

    public static CustomerOrder findByCode(String code) {
        return find("orderCode", code).firstResult();
    }
}
