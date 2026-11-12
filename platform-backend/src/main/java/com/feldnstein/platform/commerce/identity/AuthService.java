package com.feldnstein.platform.commerce.identity;

import com.feldnstein.platform.commerce.shared.DomainException;
import com.feldnstein.platform.commerce.shared.EmailAddress;
import com.feldnstein.platform.marketing.DemoNewsletterGateway;
import com.feldnstein.platform.marketing.NewsletterGateway;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Instance;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Passwordless authentication (ADR-0023): issue single-use magic links,
 * redeem them for 30-day sessions, resolve sessions. Any email may request a
 * link (the inbox itself is the proof of ownership); identity rows are
 * provisioned on first successful redemption.
 */
@ApplicationScoped
public class AuthService {

    public static final String SESSION_HEADER = "X-Customer-Token";
    static final long LINK_TTL_MINUTES = 15;
    static final long SESSION_TTL_DAYS = 30;

    private static final SecureRandom RANDOM = new SecureRandom();

    @Inject Instance<NewsletterGateway> gateways;

    @ConfigProperty(name = "newsletter.provider", defaultValue = "demo")
    String newsletterProvider;

    @ConfigProperty(name = "app.public-base-url", defaultValue = "http://localhost:4173")
    String publicBaseUrl;

    private NewsletterGateway gateway() {
        return gateways.stream()
                .filter(g -> g.getClass().getSimpleName().toLowerCase()
                        .startsWith(newsletterProvider.toLowerCase()))
                .findFirst()
                .orElseThrow(() -> new DomainException("no newsletter gateway for provider " + newsletterProvider));
    }

    /** Create and email a single-use login link. Idempotent from the caller's perspective. */
    @Transactional
    public void requestLink(String email) {
        String normalised = new EmailAddress(email).value();
        String token = newToken();
        LoginLink row = new LoginLink();
        row.tokenHash = sha256(token);
        row.email = normalised;
        row.createdAt = Instant.now();
        row.expiresAt = row.createdAt.plus(LINK_TTL_MINUTES, ChronoUnit.MINUTES);
        row.persist();
        gateway().sendTransactional(normalised, "Your FELD·N·STEIN sign-in link",
                "Sign in to track orders, see loyalty points, and reorder in one tap:\n\n"
                        + publicBaseUrl + "/#auth?t=" + token + "\n\n"
                        + "The link works once and expires in " + LINK_TTL_MINUTES + " minutes.");
    }

    /** Redeem a magic link for a session token. Throws {@link DomainException} on any rejection. */
    @Transactional
    public String verify(String token) {
        if (token == null || token.isBlank()) throw new DomainException("token is required");
        LoginLink row = LoginLink.findByHash(sha256(token.trim()));
        if (row == null) throw new DomainException("invalid sign-in link");
        if (row.consumed()) throw new DomainException("this sign-in link was already used");
        if (row.expired(Instant.now())) throw new DomainException("this sign-in link has expired — request a new one");
        row.consumedAt = Instant.now();
        CustomerIdentity.provision(row.email, null);
        return openSession(row.email);
    }

    @Transactional
    public String openSession(String email) {
        String normalised = new EmailAddress(email).value();
        String token = newToken();
        CustomerSession session = new CustomerSession();
        session.tokenHash = sha256(token);
        session.email = normalised;
        session.createdAt = Instant.now();
        session.expiresAt = session.createdAt.plus(SESSION_TTL_DAYS, ChronoUnit.DAYS);
        session.persist();
        return token;
    }

    /** Resolve a session header value to an email, or null when absent/expired. */
    @Transactional
    public String resolve(String headerToken) {
        if (headerToken == null || headerToken.isBlank()) return null;
        CustomerSession session = CustomerSession.findByHash(sha256(headerToken.trim()));
        if (session == null || session.expired(Instant.now())) return null;
        return session.email;
    }

    /** End a session (logout). */
    @Transactional
    public void revoke(String headerToken) {
        if (headerToken == null || headerToken.isBlank()) return;
        CustomerSession session = CustomerSession.findByHash(sha256(headerToken.trim()));
        if (session != null) session.delete();
    }

    /** Latest usable login token for an email — demo-provider only, for dev/e2e link pickup. */
    public String pendingLinkFor(String email) {
        if (!"demo".equalsIgnoreCase(newsletterProvider)) return null;
        DemoNewsletterGateway.CapturedSend send =
                DemoNewsletterGateway.lastSendTo(new EmailAddress(email).value());
        if (send == null) return null;
        String marker = "/#auth?t=";
        int at = send.body().indexOf(marker);
        if (at < 0) return null;
        String token = send.body().substring(at + marker.length()).trim().split("\\s", 2)[0];
        LoginLink row = LoginLink.findByHash(sha256(token));
        return row == null || row.consumed() || row.expired(Instant.now()) ? null : token;
    }

    static String newToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
