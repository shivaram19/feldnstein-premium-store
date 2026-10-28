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
import java.math.BigDecimal;

@Entity
@Table(name = "purchase_order_line")
public class PurchaseOrderLine extends PanacheEntity {

    public enum ItemType { BOTTLE, CAP, LABEL, OUTER_BOX, OTHER }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "po_id", nullable = false)
    public PurchaseOrder purchaseOrder;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_type", nullable = false, length = 32)
    public ItemType itemType;

    @Column(length = 128)
    public String spec;

    @Column(nullable = false)
    public int quantity;

    @Column(name = "unit_price", nullable = false, precision = 12, scale = 2)
    public BigDecimal unitPrice;

    @Column(name = "tax_pct", precision = 5, scale = 2)
    public BigDecimal taxPct = BigDecimal.ZERO;
}
