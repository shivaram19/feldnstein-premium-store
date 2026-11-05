package com.feldnstein.platform.crm;

import com.feldnstein.platform.commerce.shared.DomainException;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;

/**
 * CRM contact — one row per email (lower-case normalised, unique), the system
 * of record for social handles and the WhatsApp opt-in that Meta's Business
 * Messaging Policy requires before any WhatsApp contact. Upserts never clobber
 * status or opt-in unless the caller provides them.
 */
@Entity
@Table(name = "crm_contact")
public class CrmContact extends PanacheEntity {

    public enum Status { LEAD, CONTACTED, QUALIFIED, ACTIVE, INACTIVE, LOST }

    @Column(nullable = false, unique = true)
    private String email;

    @Column
    private String name;

    @Column(length = 32)
    private String phone;

    @Column(name = "whatsapp_phone", length = 32)
    private String whatsappPhone;

    @Column(name = "whatsapp_opt_in", nullable = false)
    private boolean whatsappOptIn = false;

    @Column(name = "whatsapp_opt_in_source", length = 64)
    private String whatsappOptInSource;

    @Column(name = "instagram_handle", length = 64)
    private String instagramHandle;

    @Column(length = 64)
    private String source;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Status status = Status.LEAD;

    @Column(length = 255)
    private String tags;

    @Version
    private Long version;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected CrmContact() {}

    /** Factory: a new contact; the email is already normalised by the caller. */
    public static CrmContact create(String email, String name) {
        CrmContact contact = new CrmContact();
        contact.email = email;
        contact.name = name;
        return contact;
    }

    public static CrmContact findByEmail(String email) {
        if (email == null) return null;
        return find("lower(email) = ?1", email.trim().toLowerCase()).firstResult();
    }

    public static Status parseStatus(String raw) {
        try {
            return Status.valueOf(raw.trim().toUpperCase());
        } catch (Exception e) {
            throw new DomainException("unknown status '" + raw
                    + "' — supported: LEAD, CONTACTED, QUALIFIED, ACTIVE, INACTIVE, LOST");
        }
    }

    public void touch() {
        updatedAt = Instant.now();
    }

    public String email() { return email; }
    public String name() { return name; }
    public String phone() { return phone; }
    public String whatsappPhone() { return whatsappPhone; }
    public boolean whatsappOptIn() { return whatsappOptIn; }
    public String whatsappOptInSource() { return whatsappOptInSource; }
    public String instagramHandle() { return instagramHandle; }
    public String source() { return source; }
    public Status status() { return status; }
    public String tags() { return tags; }
    public Instant createdAt() { return createdAt; }
    public Instant updatedAt() { return updatedAt; }

    public void setName(String name) { this.name = name; }
    public void setPhone(String phone) { this.phone = phone; }
    public void setWhatsappPhone(String whatsappPhone) { this.whatsappPhone = whatsappPhone; }
    public void setWhatsappOptIn(boolean whatsappOptIn) { this.whatsappOptIn = whatsappOptIn; }
    public void setWhatsappOptInSource(String whatsappOptInSource) { this.whatsappOptInSource = whatsappOptInSource; }
    public void setInstagramHandle(String instagramHandle) { this.instagramHandle = instagramHandle; }
    public void setSource(String source) { this.source = source; }
    public void setStatus(Status status) { this.status = status; }
    public void setTags(String tags) { this.tags = tags; }
}
