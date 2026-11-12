package com.feldnstein.platform.commerce.identity;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * Single-use magic-link token (ADR-0023). Only the SHA-256 hash is stored;
 * the plaintext token exists solely in the emailed link and the request that
 * redeems it. 15-minute validity, one redemption.
 */
@Entity
@Table(name = "login_link")
public class LoginLink extends PanacheEntity {

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    public String tokenHash;

    @Column(nullable = false, length = 128)
    public String email;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt;

    @Column(name = "expires_at", nullable = false)
    public Instant expiresAt;

    @Column(name = "consumed_at")
    public Instant consumedAt;

    public static LoginLink findByHash(String tokenHash) {
        return find("tokenHash", tokenHash).firstResult();
    }

    public boolean expired(Instant now) {
        return now.isAfter(expiresAt);
    }

    public boolean consumed() {
        return consumedAt != null;
    }
}
