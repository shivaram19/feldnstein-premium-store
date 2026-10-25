package com.feldnstein.platform;

import java.time.Instant;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;

@Entity
public class StockMovement extends PanacheEntity {
    public long productId;
    public String type; // IN / OUT / ADJUST
    public int quantity;
    public String reason;
    public Instant createdAt = Instant.now();
}
