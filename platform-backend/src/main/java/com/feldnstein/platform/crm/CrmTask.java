package com.feldnstein.platform.crm;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * CRM follow-up task — a promise made to a contact with a due date, so
 * follow-ups do not fall through cracks. Completion is timestamped.
 */
@Entity
@Table(name = "crm_task")
public class CrmTask extends PanacheEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contact_id", nullable = false)
    private CrmContact contact;

    @Column(nullable = false)
    private String subject;

    @Column(name = "due_at")
    private Instant dueAt;

    @Column(nullable = false)
    private boolean done = false;

    @Column(name = "created_by", length = 128)
    private String createdBy;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected CrmTask() {}

    /** Factory: a new open task. */
    public static CrmTask create(CrmContact contact, String subject, Instant dueAt, String createdBy) {
        CrmTask task = new CrmTask();
        task.contact = contact;
        task.subject = subject;
        task.dueAt = dueAt;
        task.createdBy = createdBy;
        return task;
    }

    public void complete(Instant at) {
        done = true;
        completedAt = at;
    }

    public boolean overdue(Instant now) {
        return !done && dueAt != null && dueAt.isBefore(now);
    }

    public CrmContact contact() { return contact; }
    public String subject() { return subject; }
    public Instant dueAt() { return dueAt; }
    public boolean done() { return done; }
    public String createdBy() { return createdBy; }
    public Instant completedAt() { return completedAt; }
    public Instant createdAt() { return createdAt; }
}
