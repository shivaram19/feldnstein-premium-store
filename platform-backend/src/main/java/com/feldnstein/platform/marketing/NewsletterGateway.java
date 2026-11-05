package com.feldnstein.platform.marketing;

/**
 * Newsletter gateway port — the anti-corruption layer between the platform
 * and a subscriber-capture provider (Listmonk REST API, or the built-in demo
 * gateway persisting to the local {@code subscriber} table). Subscription is
 * idempotent: an already-subscribed email is a success, not an error.
 */
public interface NewsletterGateway {

    /** Subscribe an email address (idempotent on email). */
    void subscribe(String email, String name);
}
