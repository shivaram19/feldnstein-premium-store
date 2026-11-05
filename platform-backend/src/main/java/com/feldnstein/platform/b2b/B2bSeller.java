package com.feldnstein.platform.b2b;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/**
 * B2B seller — the wholesale customer directory. Sellers are plain data;
 * the order lifecycle lives on {@link WholesaleOrder}.
 */
@Entity
@Table(name = "b2b_seller")
public class B2bSeller extends PanacheEntity {

    @Column(nullable = false, unique = true, length = 32)
    public String code;

    @Column(nullable = false, length = 128)
    public String name;

    @Column(name = "contact_name", length = 128)
    public String contactName;

    @Column(length = 32)
    public String phone;

    @Column(length = 128)
    public String email;

    @Column(length = 32)
    public String gst;

    @Column(length = 255)
    public String address;

    @Column(nullable = false)
    public boolean active = true;
}
