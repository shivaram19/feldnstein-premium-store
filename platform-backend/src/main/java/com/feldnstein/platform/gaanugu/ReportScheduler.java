package com.feldnstein.platform.gaanugu;

import io.quarkus.arc.Unremovable;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.time.LocalDate;

/**
 * Scheduler for due report schedules (ADR-0011). Lives in its own unsecured bean because
 * @Scheduled methods on a @RolesAllowed resource would fail authorization in the scheduler
 * thread (no security identity there), and proxy calls into a secured bean would too.
 */
@Unremovable
@ApplicationScoped
public class ReportScheduler {

    @Inject
    ReportEngine engine;

    @Scheduled(every = "60s")
    void checkDue() {
        LocalDate today = LocalDate.now();
        for (ReportSchedule s : ReportSchedule.<ReportSchedule>list("active", true)) {
            if (s.nextRun != null && !s.nextRun.isAfter(today)) {
                QuarkusTransaction.requiringNew().run(() -> runSchedule(s));
            }
        }
    }

    /** Produces a report_run holding the CSV and advances next_run. Call inside a transaction. */
    void runSchedule(ReportSchedule s) {
        ReportRun run = new ReportRun();
        run.schedule = s;
        run.reportType = s.reportType;
        run.paramsJson = s.paramsJson;
        run.csvContent = engine.csvFor(s.reportType, s.paramsJson);
        run.persist();
        LocalDate base = s.nextRun != null ? s.nextRun : LocalDate.now();
        s.nextRun = switch (s.frequency) {
            case DAILY -> base.plusDays(1);
            case WEEKLY -> base.plusWeeks(1);
            case MONTHLY -> base.plusMonths(1);
        };
    }
}
