package com.feldnstein.platform.gaanugu;

import io.quarkus.scheduler.Scheduled;
import io.quarkus.arc.Unremovable;
import io.quarkus.narayana.jta.QuarkusTransaction;
import jakarta.enterprise.context.ApplicationScoped;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

/**
 * Materialises alert rows from active alert_rule thresholds (ADR-0008).
 * Runs on a timer and on demand (POST /g/alerts/regenerate).
 */
@Unremovable
@ApplicationScoped
public class AlertEvaluator {

    public record Condition(String type, String refType, String refId, String message, Alert.Severity severity) {}

    @Scheduled(every = "60s")
    void tick() {
        regenerate();
    }

    /** Recomputes all active rules: opens new alerts, resolves cleared ones. */
    public void regenerate() {
        QuarkusTransaction.requiringNew().run(this::evaluateInTx);
    }

    void evaluateInTx() {
        Set<String> activeKeys = new HashSet<>();

        for (AlertRule rule : AlertRule.<AlertRule>list("active", true)) {
            for (Condition c : conditionsFor(rule)) {
                activeKeys.add(c.type() + "|" + c.refId());
                boolean alreadyOpen = Alert.<Alert>stream("alertType", c.type())
                        .anyMatch(a -> a.status == Alert.AlertStatus.OPEN && c.refId().equals(a.refId));
                if (!alreadyOpen) {
                    Alert a = new Alert();
                    a.rule = rule;
                    a.alertType = c.type();
                    a.severity = c.severity();
                    a.message = c.message();
                    a.refType = c.refType();
                    a.refId = c.refId();
                    a.persist();
                }
            }
        }

        // Resolve OPEN alerts whose condition has cleared.
        Alert.<Alert>stream("status", Alert.AlertStatus.OPEN)
                .filter(a -> !activeKeys.contains(a.alertType + "|" + a.refId))
                .forEach(a -> {
                    a.status = Alert.AlertStatus.RESOLVED;
                    a.resolvedAt = Instant.now();
                });
    }

    private java.util.List<Condition> conditionsFor(AlertRule rule) {
        return switch (rule.ruleType) {
            case LOW_STOCK -> StockLevel.<StockLevel>streamAll()
                    .filter(s -> rule.scopeRef == null || rule.scopeRef.equals("ALL")
                            || rule.scopeRef.equals(s.variant.sku))
                    .filter(s -> s.getAvailable() < rule.thresholdValue)
                    .map(s -> new Condition("LOW_STOCK", "STOCK_LEVEL", "SL-" + s.id,
                            s.variant.sku + " available " + s.getAvailable() + " < threshold " + rule.thresholdValue,
                            s.getAvailable() <= 0 ? Alert.Severity.CRITICAL : Alert.Severity.WARNING))
                    .toList();
            case NEAR_EXPIRY -> StockLevel.<StockLevel>streamAll()
                    .filter(s -> s.expiryDate != null)
                    .filter(s -> !s.expiryDate.isAfter(LocalDate.now().plusDays(rule.thresholdValue)))
                    .map(s -> new Condition("NEAR_EXPIRY", "STOCK_LEVEL", "SL-" + s.id,
                            s.variant.sku + " expires " + s.expiryDate + " (within " + rule.thresholdValue + " days)",
                            s.expiryDate.isBefore(LocalDate.now()) ? Alert.Severity.CRITICAL : Alert.Severity.WARNING))
                    .toList();
            case QC_OVERDUE -> ProductionBatch.<ProductionBatch>streamAll()
                    .filter(b -> b.status == ProductionBatch.BatchStatus.QC_PENDING)
                    .filter(b -> b.pressDate.plusDays(rule.thresholdValue).isBefore(LocalDate.now()))
                    .map(b -> new Condition("QC_OVERDUE", "BATCH", b.batchCode,
                            b.batchCode + " in QC_PENDING since " + b.pressDate,
                            Alert.Severity.WARNING))
                    .toList();
        };
    }
}
