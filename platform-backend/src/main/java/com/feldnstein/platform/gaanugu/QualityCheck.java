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
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "quality_check")
public class QualityCheck extends PanacheEntity {

    public enum CheckStage { PRE_PRESS, POST_PRESS, PRE_RELEASE }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id", nullable = false)
    public ProductionBatch batch;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    public CheckStage stage;

    @Column(name = "moisture_pct", precision = 5, scale = 2)
    public BigDecimal moisturePct;

    @Column(name = "foreign_matter_pct", precision = 5, scale = 2)
    public BigDecimal foreignMatterPct;

    @Column(name = "aflatoxin_ppb", precision = 8, scale = 2)
    public BigDecimal aflatoxinPpb;

    @Column(name = "pesticide_residue", length = 64)
    public String pesticideResidue;

    /** Cold-press claim proof: must stay below 40°C. */
    @Column(name = "oil_temp_celsius", precision = 5, scale = 2)
    public BigDecimal oilTempCelsius;

    @Column(name = "seal_integrity_ok")
    public Boolean sealIntegrityOk;

    @Column(name = "overall_pass", nullable = false)
    public boolean overallPass;

    @Column(length = 1000)
    public String notes;

    @Column(name = "photo_refs", length = 1000)
    public String photoRefs;

    @Column(name = "checked_by", length = 128)
    public String checkedBy;

    @Column(name = "checked_at", nullable = false)
    public Instant checkedAt = Instant.now();
}
