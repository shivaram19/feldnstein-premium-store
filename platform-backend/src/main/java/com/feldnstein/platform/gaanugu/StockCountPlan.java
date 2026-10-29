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
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "stock_count_plan")
public class StockCountPlan extends PanacheEntity {

    public enum CountStatus { PLANNED, IN_PROGRESS, COMPLETED, RECONCILED }

    @Column(name = "plan_code", nullable = false, unique = true, length = 32)
    public String planCode;

    @Column(name = "scope_desc", length = 200)
    public String scopeDesc;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id")
    public Warehouse warehouse;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    public CountStatus status = CountStatus.PLANNED;

    @Column(name = "created_by", length = 128)
    public String createdBy;

    @Column(name = "planned_date")
    public LocalDate plannedDate;

    @Column(name = "completed_at")
    public Instant completedAt;
}
