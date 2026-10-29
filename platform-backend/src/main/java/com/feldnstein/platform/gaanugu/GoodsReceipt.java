package com.feldnstein.platform.gaanugu;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;

@Entity
@Table(name = "goods_receipt")
public class GoodsReceipt extends PanacheEntity {

    @Column(name = "grn_number", unique = true, nullable = false, length = 32)
    public String grnNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "po_id", nullable = false)
    public PurchaseOrder purchaseOrder;

    @Column(name = "receipt_date", nullable = false)
    public LocalDate receiptDate;

    @Column(name = "delivery_note_no", length = 64)
    public String deliveryNoteNo;

    @Column(name = "condition_note", length = 500)
    public String conditionNote;

    @Column(name = "received_by", length = 128)
    public String receivedBy;
}
