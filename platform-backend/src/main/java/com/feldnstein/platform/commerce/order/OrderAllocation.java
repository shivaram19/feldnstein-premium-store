package com.feldnstein.platform.commerce.order;

import com.feldnstein.platform.gaanugu.inventory.StockLevel;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * Records one reserved slice of a stock position for an order — written at
 * checkout, replayed exactly on release (cancel) and deduct (ship). Part of
 * the Order aggregate.
 */
@Entity
@Table(name = "order_allocation")
public class OrderAllocation extends PanacheEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private CustomerOrder order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stock_level_id", nullable = false)
    private StockLevel stockLevel;

    @Column(nullable = false)
    private int qty;

    protected OrderAllocation() {}

    public static OrderAllocation of(CustomerOrder order, StockLevel stockLevel, int qty) {
        OrderAllocation a = new OrderAllocation();
        a.order = order;
        a.stockLevel = stockLevel;
        a.qty = qty;
        return a;
    }

    public CustomerOrder order() { return order; }
    public StockLevel stockLevel() { return stockLevel; }
    public int qty() { return qty; }
}
