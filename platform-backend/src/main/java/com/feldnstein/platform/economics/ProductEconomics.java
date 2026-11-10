package com.feldnstein.platform.economics;

import com.feldnstein.platform.gaanugu.catalog.OilProduct;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "product_economics")
public class ProductEconomics extends PanacheEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    public OilProduct product;

    @Column(name = "trips_per_day", nullable = false)
    public int tripsPerDay;

    @Column(name = "output_pct", nullable = false, precision = 5, scale = 4)
    public BigDecimal outputPct;

    @Column(name = "raw_material_kg_per_trip", nullable = false, precision = 10, scale = 2)
    public BigDecimal rawMaterialKgPerTrip;

    @Column(name = "material_cost_per_kg_override", precision = 12, scale = 2)
    public BigDecimal materialCostPerKgOverride;

    @Column(name = "daily_wages", nullable = false, precision = 12, scale = 2)
    public BigDecimal dailyWages;

    @Column(name = "wage_days_per_year", nullable = false)
    public int wageDaysPerYear = 365;

    @Column(name = "yearly_fodder", nullable = false, precision = 14, scale = 2)
    public BigDecimal yearlyFodder;

    @Column(name = "bottles_per_litre", nullable = false, precision = 8, scale = 2)
    public BigDecimal bottlesPerLitre;

    @Column(name = "bottle_cost_paise", nullable = false)
    public long bottleCostPaise;

    @Column(name = "shop_allocation_per_year", nullable = false, precision = 14, scale = 2)
    public BigDecimal shopAllocationPerYear;

    @Column(name = "setup_cost", nullable = false, precision = 14, scale = 2)
    public BigDecimal setupCost;

    @Column(name = "depreciation_years", nullable = false)
    public int depreciationYears;

    @Version
    public long version;

    @Column(name = "updated_at", nullable = false)
    public Instant updatedAt = Instant.now();
}
