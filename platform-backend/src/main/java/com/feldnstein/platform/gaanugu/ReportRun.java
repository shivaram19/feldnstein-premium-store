package com.feldnstein.platform.gaanugu;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "report_run")
public class ReportRun extends PanacheEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "schedule_id")
    public ReportSchedule schedule;

    @Column(name = "report_type", nullable = false, length = 64)
    public String reportType;

    @Column(name = "params_json", length = 2000)
    public String paramsJson;

    @Column(name = "run_at", nullable = false)
    public Instant runAt = Instant.now();

    /** CSV payload — reports are small (KBs), bounded varchar rather than a LOB for
     *  cross-database portability (H2 TEXT/Postgres TEXT). */
    @Column(name = "csv_content", length = 1_000_000)
    public String csvContent;
}
