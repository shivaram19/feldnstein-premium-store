package com.feldnstein.platform.commerce;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;
import java.time.Instant;

@Entity
public class LoyaltyTransaction extends PanacheEntity {
    public long accountId;
    public int delta;
    public String reason;
    public Instant createdAt = Instant.now();
}
