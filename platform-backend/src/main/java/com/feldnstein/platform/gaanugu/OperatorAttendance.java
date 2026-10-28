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
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "operator_attendance",
        uniqueConstraints = @UniqueConstraint(columnNames = {"work_date", "operator_id"}))
public class OperatorAttendance extends PanacheEntity {

    public enum AttendanceStatus { PRESENT, ABSENT, HALF_DAY }

    @Column(name = "work_date", nullable = false)
    public LocalDate workDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "operator_id", nullable = false)
    public PressOperator operator;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    public AttendanceStatus status = AttendanceStatus.PRESENT;

    @Column(name = "check_in")
    public LocalTime checkIn;

    @Column(name = "check_out")
    public LocalTime checkOut;

    @Column(name = "hours_worked", precision = 4, scale = 2)
    public BigDecimal hoursWorked;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "press_id")
    public Press press;

    @Column(name = "batches_worked", length = 128)
    public String batchesWorked;

    @Column(name = "overtime_hrs", precision = 4, scale = 2)
    public BigDecimal overtimeHrs = BigDecimal.ZERO;
}
