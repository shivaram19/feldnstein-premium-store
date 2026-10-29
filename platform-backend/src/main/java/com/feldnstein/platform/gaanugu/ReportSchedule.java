package com.feldnstein.platform.gaanugu;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.LocalDate;

@Entity
@Table(name = "report_schedule")
public class ReportSchedule extends PanacheEntity {

    public enum Frequency { DAILY, WEEKLY, MONTHLY }

    @Column(nullable = false, length = 128)
    public String name;

    @Column(name = "report_type", nullable = false, length = 64)
    public String reportType;

    @Column(name = "params_json", length = 2000)
    public String paramsJson;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    public Frequency frequency;

    @Column(name = "next_run")
    public LocalDate nextRun;

    @Column(nullable = false)
    public boolean active = true;
}
