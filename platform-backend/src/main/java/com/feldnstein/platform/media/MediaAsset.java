package com.feldnstein.platform.media;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "media_asset")
public class MediaAsset extends PanacheEntity {

    public enum Status { DRAFT, PROCESSING, READY, PUBLISHED, ERROR }

    @Column(name = "asset_key", nullable = false, length = 128)
    public String assetKey;

    @Column(name = "original_filename", nullable = false, length = 255)
    public String originalFilename;

    @Column(name = "content_type", nullable = false, length = 64)
    public String contentType;

    @Column(name = "size_bytes", nullable = false)
    public long sizeBytes;

    @Column(name = "alt_text", length = 255)
    public String altText;

    @jakarta.persistence.Enumerated(jakarta.persistence.EnumType.STRING)
    @Column(nullable = false, length = 16)
    public Status status = Status.DRAFT;

    @Column(nullable = false)
    public boolean finalized;

    @Column(name = "error_note", length = 500)
    public String errorNote;

    @Column(name = "storage_key", nullable = false, length = 255)
    public String storageKey;

    @Column(name = "created_by", length = 64)
    public String createdBy;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    public Instant updatedAt;

    @PrePersist void onCreate() { Instant now = Instant.now(); createdAt = now; updatedAt = now; }
    @PreUpdate void onUpdate() { updatedAt = Instant.now(); }
}
