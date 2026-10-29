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
import java.time.LocalDate;

@Entity
@Table(name = "seed_procurement")
public class SeedProcurement extends PanacheEntity {

    public enum PaymentStatus { PENDING, PAID }

    @Column(name = "procurement_date", nullable = false)
    public LocalDate procurementDate;

    @Column(name = "seed_type", nullable = false, length = 64)
    public String seedType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "farmer_id", nullable = false)
    public Supplier farmer;

    @Column(name = "qty_kg", nullable = false, precision = 12, scale = 2)
    public BigDecimal qtyKg;

    @Column(name = "rate_per_kg", nullable = false, precision = 12, scale = 2)
    public BigDecimal ratePerKg;

    @Column(name = "total_cost", nullable = false, precision = 14, scale = 2)
    public BigDecimal totalCost;

    @Column(name = "quality_grade", length = 16)
    public String qualityGrade;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, length = 16)
    public PaymentStatus paymentStatus = PaymentStatus.PENDING;

    @Column(name = "transport_cost", precision = 12, scale = 2)
    public BigDecimal transportCost = BigDecimal.ZERO;
}
