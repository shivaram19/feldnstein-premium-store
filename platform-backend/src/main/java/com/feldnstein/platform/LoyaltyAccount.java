package com.feldnstein.platform;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;

@Entity
public class LoyaltyAccount extends PanacheEntity {
    @Column(unique = true)
    public String memberEmail;
    public String name;
    public String tier; // BRONZE / SILVER / GOLD
    public int pointsBalance = 0;
}
