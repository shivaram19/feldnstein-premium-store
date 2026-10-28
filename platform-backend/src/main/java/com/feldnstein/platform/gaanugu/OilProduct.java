package com.feldnstein.platform.gaanugu;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

@Entity
@Table(name = "oil_product")
public class OilProduct extends PanacheEntity {

    public enum OilSource { GROUNDNUT, SESAME, COCONUT, MUSTARD, SUNFLOWER, OTHER }

    @Column(unique = true, nullable = false, length = 32)
    public String code;

    @Column(nullable = false, length = 128)
    public String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "oil_source", nullable = false, length = 32)
    public OilSource oilSource;

    @Column(name = "shelf_life_days", nullable = false)
    public int shelfLifeDays = 365;

    @Column(name = "nutritional_info", length = 2000)
    public String nutritionalInfo;

    @Column(nullable = false)
    public boolean active = true;
}
