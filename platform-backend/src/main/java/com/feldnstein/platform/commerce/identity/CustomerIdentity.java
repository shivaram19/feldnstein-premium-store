package com.feldnstein.platform.commerce.identity;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;

/** Verified customer identity — created on first successful magic-link sign-in (ADR-0023). */
@Entity
@Table(name = "customer_identity")
public class CustomerIdentity extends PanacheEntity {

    @Column(nullable = false, unique = true, length = 128)
    public String email;

    @Column(length = 128)
    public String name;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt;

    public static CustomerIdentity findByEmail(String email) {
        return find("email", email.trim().toLowerCase()).firstResult();
    }

    public static CustomerIdentity provision(String email, String name) {
        CustomerIdentity existing = findByEmail(email);
        if (existing != null) {
            if (name != null && !name.isBlank() && (existing.name == null || existing.name.isBlank())) {
                existing.name = name.trim();
            }
            return existing;
        }
        CustomerIdentity row = new CustomerIdentity();
        row.email = email.trim().toLowerCase();
        row.name = name == null || name.isBlank() ? null : name.trim();
        row.createdAt = Instant.now();
        row.persist();
        return row;
    }
}
