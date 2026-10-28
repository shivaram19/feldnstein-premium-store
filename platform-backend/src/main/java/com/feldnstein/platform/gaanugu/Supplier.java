package com.feldnstein.platform.gaanugu;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

@Entity
@Table(name = "supplier")
public class Supplier extends PanacheEntity {

    public enum SupplierType { FARMER, PACKAGING }

    @Column(unique = true, nullable = false, length = 32)
    public String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    public SupplierType type;

    @Column(nullable = false, length = 128)
    public String name;

    @Column(length = 16)
    public String phone;

    @Column(length = 500)
    public String address;

    @Column(name = "bank_details", length = 500)
    public String bankDetails;

    @Column(length = 16)
    public String gst;

    @Column(nullable = false)
    public boolean active = true;
}
