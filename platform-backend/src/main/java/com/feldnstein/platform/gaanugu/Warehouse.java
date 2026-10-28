package com.feldnstein.platform.gaanugu;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

@Entity
@Table(name = "warehouse")
public class Warehouse extends PanacheEntity {

    public enum WarehouseType { PRODUCTION, FULFILMENT, PARTNER_HUB }

    @Column(unique = true, nullable = false, length = 32)
    public String code;

    @Column(nullable = false, length = 128)
    public String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    public WarehouseType type;

    @Column(length = 500)
    public String address;

    @Column(name = "manager_name", length = 128)
    public String managerName;

    @Column(name = "manager_phone", length = 16)
    public String managerPhone;
}
