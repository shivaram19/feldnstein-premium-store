package com.feldnstein.platform.media;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "content_block")
public class ContentBlock extends PanacheEntity {

    @Column(name = "block_key", nullable = false, length = 128)
    public String blockKey;

    @Column(nullable = false, columnDefinition = "TEXT")
    public String payload;

    @Column(name = "updated_by", length = 64)
    public String updatedBy;

    @Column(name = "updated_at", nullable = false)
    public Instant updatedAt;

    @PrePersist @PreUpdate void touch() { updatedAt = Instant.now(); }
}
