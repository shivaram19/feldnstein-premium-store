package com.feldnstein.platform.commerce;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
public class PurchaseOrder extends PanacheEntity {
    public String customerEmail;
    public String status; // PENDING / PAID / SHIPPED / CANCELLED
    public BigDecimal totalAmount;
    public Instant createdAt = Instant.now();
}
