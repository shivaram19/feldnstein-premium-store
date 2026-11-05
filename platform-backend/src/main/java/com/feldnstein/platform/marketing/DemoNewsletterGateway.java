package com.feldnstein.platform.marketing;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

/**
 * Demo newsletter gateway — stands in for a real subscriber provider: every
 * subscription lands in the local {@code subscriber} table. Selected when
 * {@code newsletter.provider=demo} (the default); idempotent on email.
 */
@ApplicationScoped
public class DemoNewsletterGateway implements NewsletterGateway {

    @Override
    @Transactional
    public void subscribe(String email, String name) {
        if (Subscriber.findByEmail(email) != null) return; // already subscribed — success
        Subscriber.record(email.trim(), name == null || name.isBlank() ? null : name.trim()).persist();
    }
}
