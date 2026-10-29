package com.feldnstein.platform;

import java.math.BigDecimal;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;

@Entity
public class Product extends PanacheEntity {
    public String name;
    @Column(unique = true)
    public String sku;
    public String category;
    public BigDecimal price;
    public int stockQty;
}
