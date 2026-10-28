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
@Table(name = "press_operator")
public class PressOperator extends PanacheEntity {

    public enum WageType { DAILY, HOURLY }

    @Column(unique = true, nullable = false, length = 32)
    public String code;

    @Column(nullable = false, length = 128)
    public String name;

    @Column(length = 16)
    public String phone;

    @Column(length = 12)
    public String aadhaar;

    @Column(length = 500)
    public String address;

    @Enumerated(EnumType.STRING)
    @Column(name = "wage_type", nullable = false, length = 16)
    public WageType wageType = WageType.DAILY;

    @Column(nullable = false, precision = 12, scale = 2)
    public BigDecimal rate;

    @Column(name = "bank_account", length = 64)
    public String bankAccount;

    @Column(name = "join_date")
    public LocalDate joinDate;

    @Column(nullable = false)
    public boolean active = true;
}
