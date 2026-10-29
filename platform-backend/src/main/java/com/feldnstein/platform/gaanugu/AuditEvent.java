package com.feldnstein.platform.gaanugu;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "audit_event")
public class AuditEvent extends PanacheEntity {

    @Column(nullable = false, length = 128)
    public String actor;

    @Column(nullable = false, length = 64)
    public String action;

    @Column(name = "entity_type", length = 64)
    public String entityType;

    @Column(name = "entity_id", length = 64)
    public String entityId;

    @Column(name = "detail_json", length = 4000)
    public String detailJson;

    @Column(nullable = false)
    public Instant at = Instant.now();
}
