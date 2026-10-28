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

@Entity
@Table(name = "app_user")
public class AppUser extends PanacheEntity {

    /** Role names fixed by ADR-0005 — renaming is a data migration. */
    public enum Role { ADMIN, OPERATOR, QC, INVENTORY, SALES }

    @Column(nullable = false, length = 128)
    public String name;

    @Column(unique = true, nullable = false, length = 128)
    public String email;

    @Column(length = 16)
    public String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    public Role role;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id")
    public Warehouse warehouse;

    @Column(nullable = false)
    public boolean active = true;
}
