package com.feldnstein.platform.commerce;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;
import java.time.Instant;

@Entity
public class StockMovement extends PanacheEntity {
    public long productId;
    public String type; // IN / OUT / ADJUST
    public int quantity;
    public String reason;
    public Instant createdAt = Instant.now();
}
