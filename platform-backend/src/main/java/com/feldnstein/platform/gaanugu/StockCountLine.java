package com.feldnstein.platform.gaanugu;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "stock_count_line")
public class StockCountLine extends PanacheEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id", nullable = false)
    public StockCountPlan plan;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stock_level_id", nullable = false)
    public StockLevel stockLevel;

    @Column(name = "system_qty", nullable = false)
    public int systemQty;

    @Column(name = "counted_qty")
    public Integer countedQty;

    @Column
    public Integer variance;

    @Column(name = "counted_by", length = 128)
    public String countedBy;
}
