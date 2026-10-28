package com.feldnstein.platform.gaanugu;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "goods_receipt_line")
public class GoodsReceiptLine extends PanacheEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "grn_id", nullable = false)
    public GoodsReceipt goodsReceipt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "po_line_id", nullable = false)
    public PurchaseOrderLine poLine;

    @Column(name = "qty_received", nullable = false)
    public int qtyReceived;

    @Column(name = "qty_damaged", nullable = false)
    public int qtyDamaged;

    @Column(name = "qty_short", nullable = false)
    public int qtyShort;
}
