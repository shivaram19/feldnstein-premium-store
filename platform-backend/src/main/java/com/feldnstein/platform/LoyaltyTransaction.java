package com.feldnstein.platform;

import java.time.Instant;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;

@Entity
public class LoyaltyTransaction extends PanacheEntity {
    public long accountId;
    public int delta;
    public String reason;
    public Instant createdAt = Instant.now();
}
