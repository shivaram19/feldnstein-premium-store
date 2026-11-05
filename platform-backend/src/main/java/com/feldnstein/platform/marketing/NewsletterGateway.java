package com.feldnstein.platform.marketing;

import com.feldnstein.platform.commerce.shared.DomainException;

/**
 * Newsletter gateway port — the anti-corruption layer between the platform
 * and a subscriber-capture provider (Listmonk REST API, or the built-in demo
 * gateway persisting to the local {@code subscriber} table). Subscription is
 * idempotent: an already-subscribed email is a success, not an error.
 */
public interface NewsletterGateway {

    /** Subscribe an email address (idempotent on email). */
    void subscribe(String email, String name);

    /** Send a bulk campaign through the provider and record it locally. */
    default void sendCampaign(String name, String subject, String body, int recipientCount) {
        throw new DomainException("this newsletter provider does not support campaigns");
    }
}
