package com.feldnstein.platform.commerce.identity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.Response;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** Passwordless auth flow (ADR-0023): magic link → session → /shop/me → logout. */
@QuarkusTest
class AuthResourceTest {

    @Inject AuthResource auth;
    @Inject MeResource me;

    private String email(String tag) {
        return "auth-" + tag + "-" + System.nanoTime() + "@example.com";
    }

    @Test
    void fullFlowMagicLinkToLogout() {
        String email = email("flow");

        // 1. request a link → 202; demo gateway captured the mail
        Response r = auth.magicLink(new AuthResource.MagicLinkRequest(email));
        assertEquals(202, r.getStatus());
        assertNotNull(com.feldnstein.platform.marketing.DemoNewsletterGateway.lastSendTo(email));

        // 2. dev pickup hands back a usable token
        Response dev = auth.devLink(email);
        assertEquals(200, dev.getStatus());
        @SuppressWarnings("unchecked")
        String linkToken = (String) ((Map<String, Object>) dev.getEntity()).get("token");

        // 3. verify → session token + email; identity provisioned
        Response v = auth.verify(new AuthResource.VerifyRequest(linkToken));
        assertEquals(200, v.getStatus());
        @SuppressWarnings("unchecked")
        Map<String, Object> verified = (Map<String, Object>) v.getEntity();
        String session = (String) verified.get("token");
        assertEquals(email.toLowerCase(), verified.get("email"));
        assertNotNull(CustomerIdentity.findByEmail(email));

        // 4. /shop/me answers for the session
        Response mine = me.me(session);
        assertEquals(200, mine.getStatus());
        @SuppressWarnings("unchecked")
        Map<String, Object> profile = (Map<String, Object>) mine.getEntity();
        assertEquals(email.toLowerCase(), profile.get("email"));
        assertEquals(0, profile.get("orderCount"));
        assertTrue(profile.containsKey("loyalty"));

        // 5. single use: redeeming again fails
        Response again = auth.verify(new AuthResource.VerifyRequest(linkToken));
        assertEquals(400, again.getStatus());

        // 6. logout ends the session
        auth.logout(session);
        assertEquals(401, me.me(session).getStatus());
    }

    @Test
    void invalidAndGarbageTokensAreRejected() {
        assertEquals(400, auth.verify(new AuthResource.VerifyRequest("not-a-real-token")).getStatus());

        String email = email("garbage");
        auth.magicLink(new AuthResource.MagicLinkRequest(email));
        Response dev = auth.devLink(email);
        @SuppressWarnings("unchecked")
        String good = (String) ((Map<String, Object>) dev.getEntity()).get("token");
        assertNotNull(good);
        assertEquals(400, auth.verify(new AuthResource.VerifyRequest(good + "tampered")).getStatus());
    }

    @Test
    void meAndOrdersRequireSession() {
        assertEquals(401, me.me(null).getStatus());
        assertEquals(401, me.me("no-such-session").getStatus());
        assertEquals(401, me.orders(null).getStatus());
    }

    @Test
    void nameIsCapturedFromOrderButIdentityStartsAnonymous() {
        String email = email("anon");
        auth.magicLink(new AuthResource.MagicLinkRequest(email));
        Response dev = auth.devLink(email);
        @SuppressWarnings("unchecked")
        String linkToken = (String) ((Map<String, Object>) dev.getEntity()).get("token");
        auth.verify(new AuthResource.VerifyRequest(linkToken));
        CustomerIdentity row = CustomerIdentity.findByEmail(email);
        assertNotNull(row);
        assertNull(row.name); // no order yet → anonymous until checkout fills it
    }

    @Test
    void badEmailIsRejectedBeforeAnyState() {
        assertThrows(jakarta.ws.rs.BadRequestException.class,
                () -> auth.magicLink(new AuthResource.MagicLinkRequest("not-an-email")));
        assertThrows(jakarta.ws.rs.NotFoundException.class,
                () -> auth.devLink("never-requested@example.com"));
    }

    @Test
    void tokensAreHashedAtRest() {
        String email = email("hash");
        auth.magicLink(new AuthResource.MagicLinkRequest(email));
        LoginLink row = LoginLink.<LoginLink>find("email", email.toLowerCase()).firstResult();
        assertNotNull(row);
        assertFalse(row.tokenHash.contains("@"), "stored value must be a hash, never the address-bearing token");
        assertEquals(64, row.tokenHash.length(), "SHA-256 hex");
    }
}
