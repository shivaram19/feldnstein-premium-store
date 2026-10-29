package com.feldnstein.platform.gaanugu;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;

@Entity(name = "GaanuguPurchaseOrder")
@Table(name = "purchase_order")
public class PurchaseOrder extends PanacheEntity {

    public enum PoStatus { DRAFT, SENT, PARTIALLY_RECEIVED, RECEIVED, CANCELLED }

    @Column(name = "po_number", unique = true, nullable = false, length = 32)
    public String poNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id", nullable = false)
    public Supplier supplier;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "delivery_warehouse_id", nullable = false)
    public Warehouse deliveryWarehouse;

    @Column(name = "order_date", nullable = false)
    public LocalDate orderDate;

    @Column(name = "expected_delivery")
    public LocalDate expectedDelivery;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    public PoStatus status = PoStatus.DRAFT;

    @Column(length = 500)
    public String notes;
}
