package com.feldnstein.platform.media;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "media_variant")
public class MediaVariant extends PanacheEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_id", nullable = false)
    @JsonIgnore
    public MediaAsset asset;

    @Column(name = "variant_name", nullable = false, length = 16)
    public String variantName;

    @Column(nullable = false)
    public int width;

    @Column(nullable = false)
    public int height;

    @Column(name = "storage_key", nullable = false, length = 255)
    public String storageKey;
}
