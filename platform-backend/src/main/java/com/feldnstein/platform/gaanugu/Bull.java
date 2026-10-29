package com.feldnstein.platform.gaanugu;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "bull")
public class Bull extends PanacheEntity {

    public enum HealthStatus { FIT, RESTING, TREATMENT, RETIRED }

    @Column(unique = true, nullable = false, length = 32)
    public String code;

    @Column(nullable = false, length = 128)
    public String name;

    @Column(length = 64)
    public String breed;

    @Enumerated(EnumType.STRING)
    @Column(name = "health_status", nullable = false, length = 32)
    public HealthStatus healthStatus = HealthStatus.FIT;

    @Column(name = "daily_work_limit_hrs", nullable = false, precision = 4, scale = 1)
    public BigDecimal dailyWorkLimitHrs = new BigDecimal("4.0");

    @Column(name = "rest_after_days", nullable = false)
    public int restAfterDays = 3;

    @Column(name = "acquisition_cost", precision = 14, scale = 2)
    public BigDecimal acquisitionCost;

    @Column(name = "last_vet_check")
    public LocalDate lastVetCheck;

    @Column(name = "next_vet_check")
    public LocalDate nextVetCheck;

    @Column(name = "monthly_feed_cost", precision = 12, scale = 2)
    public BigDecimal monthlyFeedCost;

    @Column(nullable = false)
    public boolean active = true;
}
