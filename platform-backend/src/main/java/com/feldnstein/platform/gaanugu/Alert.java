package com.feldnstein.platform.gaanugu;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "alert")
public class Alert extends PanacheEntity {

    public enum Severity { INFO, WARNING, CRITICAL }
    public enum AlertStatus { OPEN, DISMISSED, RESOLVED }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rule_id")
    public AlertRule rule;

    @Column(name = "alert_type", nullable = false, length = 32)
    public String alertType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    public Severity severity = Severity.WARNING;

    @Column(nullable = false, length = 500)
    public String message;

    @Column(name = "ref_type", length = 32)
    public String refType;

    @Column(name = "ref_id", length = 64)
    public String refId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    public AlertStatus status = AlertStatus.OPEN;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt = Instant.now();

    @Column(name = "resolved_at")
    public Instant resolvedAt;
}
