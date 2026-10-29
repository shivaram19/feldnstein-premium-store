package com.feldnstein.platform.gaanugu;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

@Entity
@Table(name = "alert_rule")
public class AlertRule extends PanacheEntity {

    public enum RuleType { LOW_STOCK, NEAR_EXPIRY, QC_OVERDUE }

    @Enumerated(EnumType.STRING)
    @Column(name = "rule_type", nullable = false, length = 32)
    public RuleType ruleType;

    /** SKU / product code / 'ALL'; NULL means apply to everything. */
    @Column(name = "scope_ref", length = 64)
    public String scopeRef;

    @Column(name = "threshold_value", nullable = false)
    public int thresholdValue;

    @Column(nullable = false)
    public boolean active = true;
}
