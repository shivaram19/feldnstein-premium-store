package com.feldnstein.platform.media;

import com.feldnstein.platform.gaanugu.OilProduct;
import com.fasterxml.jackson.annotation.JsonIgnore;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "product_marketing")
public class ProductMarketing extends PanacheEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    @JsonIgnore
    public OilProduct product;

    @Column(length = 128)
    public String badge;

    @Column(name = "short_desc", length = 500)
    public String shortDesc;

    @Column(name = "long_desc", columnDefinition = "TEXT")
    public String longDesc;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "card_asset_id")
    @JsonIgnore
    public MediaAsset cardAsset;

    @jakarta.persistence.Transient
    public Long getProductId() { return product == null ? null : product.id; }

    @jakarta.persistence.Transient
    public Long getCardAssetId() { return cardAsset == null ? null : cardAsset.id; }
}
