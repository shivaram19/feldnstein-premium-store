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

    /**
     * Send a single transactional email (magic links, receipts). Providers
     * without transactional capability may throw; the demo gateway captures
     * sends so dev/e2e flows can pick the link back up (ADR-0023).
     */
    default void sendTransactional(String to, String subject, String body) {
        throw new DomainException("this newsletter provider does not support transactional mail");
    }
}
