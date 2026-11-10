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

@Entity
@Table(name = "price_rule")
public class PriceRule extends PanacheEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    public OilProduct product;

    @Column(name = "target_margin_pct", nullable = false, precision = 5, scale = 4)
    public BigDecimal targetMarginPct;

    @Column(name = "min_margin_pct", nullable = false, precision = 5, scale = 4)
    public BigDecimal minMarginPct;

    @Version
    public long version;
}
