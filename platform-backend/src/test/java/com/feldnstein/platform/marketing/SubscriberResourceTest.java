package com.feldnstein.platform.marketing;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.Response;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

@QuarkusTest
class SubscriberResourceTest {

    @Inject SubscribeResource subscribe;
    @Inject MarketingResource marketing;

    @Test
    void validSubscribePersistsRow() {
        String email = "sub-" + System.nanoTime() + "@example.com";
        Response r = subscribe.subscribe(new SubscribeResource.SubscribeRequest(email, "Test Buyer"));
        assertEquals(200, r.getStatus());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) r.getEntity();
        assertEquals("subscribed", body.get("status"));
        assertEquals("demo", body.get("provider"));

        Subscriber row = Subscriber.findByEmail(email);
        assertNotNull(row, "subscriber row must be persisted");
        assertEquals("Test Buyer", row.name());
        assertEquals("storefront", row.source());
    }

    @Test
    void duplicateSubscribeIsIdempotent() {
        String email = "dup-" + System.nanoTime() + "@example.com";
        assertEquals(200, subscribe.subscribe(new SubscribeResource.SubscribeRequest(email, "First")).getStatus());
        assertEquals(200, subscribe.subscribe(new SubscribeResource.SubscribeRequest(email, "Second")).getStatus());
        assertEquals(1, Subscriber.find("lower(email) = ?1", email.toLowerCase()).count(),
                "still exactly one row for the email");
        assertEquals("First", Subscriber.findByEmail(email).name(), "first registration wins");
    }

    @Test
    void invalidEmailIsRejected() {
        Response r = subscribe.subscribe(new SubscribeResource.SubscribeRequest("not-an-email", null));
        assertEquals(400, r.getStatus());
        Response blank = subscribe.subscribe(new SubscribeResource.SubscribeRequest("  ", null));
        assertEquals(400, blank.getStatus());
    }

    @Test
    @TestSecurity(user = "admin", roles = "ADMIN")
    void subscribersVisibleToAdmin() {
        String email = "list-" + System.nanoTime() + "@example.com";
        subscribe.subscribe(new SubscribeResource.SubscribeRequest(email, null));

        Response r = marketing.subscribers();
        assertEquals(200, r.getStatus());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) r.getEntity();
        assertEquals("demo", body.get("provider"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) body.get("subscribers");
        assertTrue(rows.stream().anyMatch(row -> row.get("email").equals(email)),
                "subscribed email must appear in the admin list");
    }
}
