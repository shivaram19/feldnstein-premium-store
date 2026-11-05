package com.feldnstein.platform.marketing;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.security.ForbiddenException;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.Response;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

@QuarkusTest
class CampaignResourceTest {

    @Inject MarketingResource marketing;

    @Test
    @TestSecurity(user = "admin", roles = "ADMIN")
    void sendCampaignAsAdminRecordsSentWithRecipientCount() {
        String email = "campaign-" + System.nanoTime() + "@example.com";
        QuarkusTransaction.requiringNew().run(() ->
                Subscriber.record(email, null).persist());

        Response r = marketing.sendCampaign(new MarketingResource.CampaignRequest(
                "Winter Drop", "New oils are here", "<p>Hello</p>"));
        assertEquals(200, r.getStatus());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) r.getEntity();
        assertEquals("SENT", body.get("status"));
        assertEquals("demo", body.get("provider"));
        assertNotNull(body.get("id"));
        long recipients = Subscriber.count();
        assertEquals((int) recipients, body.get("recipientCount"),
                "demo gateway records the live subscriber count");

        QuarkusTransaction.requiringNew().run(() -> {
            Campaign campaign = Campaign.<Campaign>findById((Long) body.get("id"));
            assertNotNull(campaign, "campaign row persisted by the demo gateway");
            assertEquals(Campaign.Status.SENT, campaign.status);
            assertEquals((int) recipients, campaign.recipientCount);
            assertNotNull(campaign.sentAt);
        });
    }

    @Test
    @TestSecurity(user = "admin", roles = "ADMIN")
    void campaignListIsNewestFirst() {
        QuarkusTransaction.requiringNew().run(() ->
                Campaign.record("First", "s1", "b1", Campaign.Status.SENT, 1, "demo", java.time.Instant.now()).persist());
        Response sent = marketing.sendCampaign(new MarketingResource.CampaignRequest("Second", "s2", "b2"));
        assertEquals(200, sent.getStatus());

        Response r = marketing.campaigns();
        assertEquals(200, r.getStatus());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) r.getEntity();
        assertTrue(rows.size() >= 2, "at least the two campaigns of this test");
        assertEquals("Second", rows.get(0).get("name"), "newest campaign first");
        assertTrue(rows.stream().anyMatch(row -> row.get("name").equals("First")));
    }

    @Test
    @TestSecurity(user = "admin", roles = "ADMIN")
    void blankFieldsRejected() {
        com.feldnstein.platform.commerce.shared.DomainException thrown = assertThrows(
                com.feldnstein.platform.commerce.shared.DomainException.class,
                () -> marketing.sendCampaign(new MarketingResource.CampaignRequest("Name", "  ", "<p>x</p>")));
        assertTrue(thrown.getMessage().contains("required"));
        assertThrows(com.feldnstein.platform.commerce.shared.DomainException.class,
                () -> marketing.sendCampaign(null));
    }

    @Test
    @TestSecurity(user = "ops", roles = "OPERATOR")
    void campaignsForbiddenForOperator() {
        assertThrows(ForbiddenException.class, () ->
                marketing.sendCampaign(new MarketingResource.CampaignRequest("N", "S", "B")));
        assertThrows(ForbiddenException.class, () -> marketing.campaigns());
    }
}
