package com.feldnstein.platform.marketing;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * Newsletter subscriber — one row per email (case-insensitive unique).
 * Captured from the public storefront form; the demo newsletter gateway
 * persists here, the listmonk gateway mirrors the same record locally so
 * the admin list stays available even when the provider is unreachable.
 */
@Entity
@Table(name = "subscriber")
public class Subscriber extends PanacheEntity {

    @Column(nullable = false, unique = true)
    private String email;

    @Column
    private String name;

    @Column(nullable = false, length = 32)
    private String source = "storefront";

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected Subscriber() {}

    /** Factory: a new storefront subscription (idempotence is the caller's check). */
    public static Subscriber record(String email, String name) {
        Subscriber s = new Subscriber();
        s.email = email;
        s.name = name;
        return s;
    }

    public static Subscriber findByEmail(String email) {
        if (email == null) return null;
        return find("lower(email) = ?1", email.trim().toLowerCase()).firstResult();
    }

    public String email() { return email; }
    public String name() { return name; }
    public String source() { return source; }
    public Instant createdAt() { return createdAt; }
}
