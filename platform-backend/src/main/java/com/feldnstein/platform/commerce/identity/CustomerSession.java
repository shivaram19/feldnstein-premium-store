package com.feldnstein.platform.commerce.identity;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * Customer session (ADR-0023). The SPA holds the plaintext bearer token in
 * localStorage and sends it as {@code X-Customer-Token}; the hash is what the
 * platform stores. 30-day validity.
 */
@Entity
@Table(name = "customer_session")
public class CustomerSession extends PanacheEntity {

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    public String tokenHash;

    @Column(nullable = false, length = 128)
    public String email;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt;

    @Column(name = "expires_at", nullable = false)
    public Instant expiresAt;

    public static CustomerSession findByHash(String tokenHash) {
        return find("tokenHash", tokenHash).firstResult();
    }

    public boolean expired(Instant now) {
        return now.isAfter(expiresAt);
    }
}
