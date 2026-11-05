package com.feldnstein.platform.crm;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * CRM interaction — one row per thing said or done on a channel (who, when,
 * which way). The platform is the conversation system of record; messaging
 * providers are only transports.
 */
@Entity
@Table(name = "crm_interaction")
public class CrmInteraction extends PanacheEntity {

    public enum Channel { NOTE, CALL, EMAIL, VISIT, WHATSAPP, INSTAGRAM }

    public enum Direction { INBOUND, OUTBOUND }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contact_id", nullable = false)
    private CrmContact contact;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Channel channel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Direction direction;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(nullable = false, length = 128)
    private String author;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected CrmInteraction() {}

    /** Factory: records what happened; the caller validates and persists. */
    public static CrmInteraction record(CrmContact contact, Channel channel, Direction direction,
                                        String body, String author) {
        CrmInteraction interaction = new CrmInteraction();
        interaction.contact = contact;
        interaction.channel = channel;
        interaction.direction = direction;
        interaction.body = body;
        interaction.author = author;
        return interaction;
    }

    public CrmContact contact() { return contact; }
    public Channel channel() { return channel; }
    public Direction direction() { return direction; }
    public String body() { return body; }
    public String author() { return author; }
    public Instant createdAt() { return createdAt; }
}
