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
@Table(name = "press")
public class Press extends PanacheEntity {

    public enum Condition { GOOD, FAIR, POOR }
    public enum PressStatus { ACTIVE, UNDER_MAINTENANCE, RETIRED }

    @Column(unique = true, nullable = false, length = 32)
    public String code;

    @Column(length = 64)
    public String type;

    @Enumerated(EnumType.STRING)
    @Column(name = "beam_condition", nullable = false, length = 32)
    public Condition beamCondition = Condition.GOOD;

    @Enumerated(EnumType.STRING)
    @Column(name = "stone_condition", nullable = false, length = 32)
    public Condition stoneCondition = Condition.GOOD;

    @Column(name = "capacity_litres", precision = 10, scale = 2)
    public BigDecimal capacityLitres;

    @Column(name = "year_built")
    public Integer yearBuilt;

    @Column(name = "last_maintenance")
    public LocalDate lastMaintenance;

    @Column(name = "next_maintenance_due")
    public LocalDate nextMaintenanceDue;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    public PressStatus status = PressStatus.ACTIVE;
}
