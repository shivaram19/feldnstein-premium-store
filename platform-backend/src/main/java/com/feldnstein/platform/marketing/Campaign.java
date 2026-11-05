package com.feldnstein.platform.marketing;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * Bulk campaign record (ADR-0018) — every campaign a gateway sends is recorded
 * locally (name, subject, status, recipient count, provider) so the admin list
 * stays available even when the provider is unreachable.
 */
@Entity
@Table(name = "campaign")
public class Campaign extends PanacheEntity {

    public enum Status { SENT, FAILED }

    @Column(nullable = false)
    public String name;

    @Column(nullable = false)
    public String subject;

    @Column(nullable = false, length = 4000)
    public String body;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    public Status status;

    @Column(name = "recipient_count", nullable = false)
    public int recipientCount;

    @Column(nullable = false, length = 32)
    public String provider;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt = Instant.now();

    @Column(name = "sent_at")
    public Instant sentAt;

    public static Campaign record(String name, String subject, String body, Status status,
                                  int recipientCount, String provider, Instant sentAt) {
        Campaign c = new Campaign();
        c.name = name;
        c.subject = subject;
        c.body = body;
        c.status = status;
        c.recipientCount = recipientCount;
        c.provider = provider;
        c.sentAt = sentAt;
        return c;
    }
}
