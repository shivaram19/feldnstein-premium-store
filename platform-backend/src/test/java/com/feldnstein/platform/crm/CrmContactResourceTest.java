package com.feldnstein.platform.crm;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.feldnstein.platform.commerce.order.CustomerOrder;
import com.feldnstein.platform.commerce.shared.DeliveryAddress;
import com.feldnstein.platform.commerce.shared.DomainException;
import com.feldnstein.platform.commerce.shared.EmailAddress;
import com.feldnstein.platform.commerce.shared.GstRate;
import com.feldnstein.platform.commerce.shared.Money;
import com.feldnstein.platform.commerce.shared.OrderNo;
import com.feldnstein.platform.commerce.shared.Quantity;
import com.feldnstein.platform.gaanugu.catalog.OilProduct;
import com.feldnstein.platform.gaanugu.catalog.ProductVariant;
import com.feldnstein.platform.loyalty.LoyaltyAccount;
import com.feldnstein.platform.marketing.Subscriber;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.security.ForbiddenException;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.Response;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

@QuarkusTest
class CrmContactResourceTest {

    @Inject CrmResource crm;
    @Inject CrmService service;

    @Test
    @TestSecurity(user = "ops", roles = "OPERATOR")
    void upsertMergesDuplicateEmailsIntoOneContact() {
        long stamp = System.nanoTime();
        String email = "crm14-" + stamp + "@example.com";

        Response created = crm.createContact(new CrmResource.ContactRequest(
                email.toUpperCase(), "Asha", null, null, null, null, null, null, "vip", null));
        assertEquals(201, created.getStatus());

        Response again = crm.createContact(new CrmResource.ContactRequest(
                email, "Asha Rao", null, null, null, null, null, null, null, null));
        assertEquals(200, again.getStatus());

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) crm.contacts(null, null).getEntity();
        List<Map<String, Object>> mine = rows.stream()
                .filter(r -> r.get("email").equals(email))
                .toList();
        assertEquals(1, mine.size(), "upsert guarantees exactly one row per email");
        assertEquals("Asha Rao", mine.get(0).get("name"), "second upsert updates the name");
        assertEquals("vip", mine.get(0).get("tags"), "tags are kept from the first upsert");
        assertEquals("LEAD", mine.get(0).get("status"));
    }

    @Test
    @TestSecurity(user = "ops", roles = "OPERATOR")
    void mergedListIncludesOrderCustomerAsActiveAndSubscriberOnlyAsLead() {
        long stamp = System.nanoTime();
        String orderEmail = "crm14-order-" + stamp + "@example.com";
        String subEmail = "crm14-sub-" + stamp + "@example.com";
        seedCustomer(orderEmail, stamp);
        QuarkusTransaction.requiringNew()
                .run(() -> Subscriber.record(subEmail, "Sub Only").persist());

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) crm.contacts(null, null).getEntity();

        Map<String, Object> orderRow = rows.stream()
                .filter(r -> r.get("email").equals(orderEmail)).findFirst().orElseThrow();
        assertEquals("ACTIVE", orderRow.get("status"), "order-derived customer is ACTIVE");
        assertEquals(1, orderRow.get("ordersCount"));
        assertEquals(12000L, orderRow.get("totalSpendPaise"));
        assertEquals(30, orderRow.get("points"));
        assertEquals(Boolean.TRUE, orderRow.get("subscribed"));

        Map<String, Object> subRow = rows.stream()
                .filter(r -> r.get("email").equals(subEmail)).findFirst().orElseThrow();
        assertEquals("LEAD", subRow.get("status"), "subscriber-only email is a LEAD");
        assertEquals(0, subRow.get("ordersCount"));
        assertEquals(Boolean.TRUE, subRow.get("subscribed"));
        assertEquals("Sub Only", subRow.get("name"));
    }

    @Test
    @TestSecurity(user = "asha", roles = "OPERATOR")
    void interactionAuthorComesFromSecurityIdentity() {
        long stamp = System.nanoTime();
        String email = "crm14-note-" + stamp + "@example.com";
        crm.createContact(new CrmResource.ContactRequest(email, null, null, null,
                null, null, null, null, null, null));

        Response r = crm.addInteraction(email, new CrmResource.InteractionRequest(
                "NOTE", null, "called, wants 1L tin", null));
        assertEquals(201, r.getStatus());

        @SuppressWarnings("unchecked")
        Map<String, Object> detail = (Map<String, Object>) crm.contact(email).getEntity();
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> interactions = (List<Map<String, Object>>) detail.get("interactions");
        assertEquals(1, interactions.size());
        assertEquals("asha", interactions.get(0).get("author"));
        assertEquals("NOTE", interactions.get(0).get("channel"));
        assertEquals("OUTBOUND", interactions.get(0).get("direction"), "direction defaults to OUTBOUND");

        Response missing = crm.contact("ghost-" + stamp + "@example.com");
        assertEquals(404, missing.getStatus());
    }

    @Test
    @TestSecurity(user = "ops", roles = "OPERATOR")
    void inboundWhatsappSetsHandleAndOpensSession() {
        long stamp = System.nanoTime();
        String email = "crm14-wa-" + stamp + "@example.com";
        crm.createContact(new CrmResource.ContactRequest(email, null, null, null,
                Boolean.TRUE, "qr-scan", null, null, null, null));

        crm.addInteraction(email, new CrmResource.InteractionRequest(
                "WHATSAPP", "INBOUND", "hi, do you deliver to Kochi?", "919876543210"));

        @SuppressWarnings("unchecked")
        Map<String, Object> detail = (Map<String, Object>) crm.contact(email).getEntity();
        @SuppressWarnings("unchecked")
        Map<String, Object> profile = (Map<String, Object>) detail.get("profile");
        assertEquals("919876543210", profile.get("whatsappPhone"), "inbound sets the handle");
        assertTrue(service.sessionOpen(email, "WHATSAPP"));
        assertFalse(service.sessionOpen(email, "INSTAGRAM"));
    }

    @Test
    @TestSecurity(user = "ops", roles = "OPERATOR")
    void inboundInstagramSetsHandle() {
        long stamp = System.nanoTime();
        String email = "crm14-ig-" + stamp + "@example.com";
        crm.createContact(new CrmResource.ContactRequest(email, null, null, null,
                null, null, null, null, null, null));

        crm.addInteraction(email, new CrmResource.InteractionRequest(
                "INSTAGRAM", "INBOUND", "loved the groundnut oil reel", "@asha.cooks"));

        @SuppressWarnings("unchecked")
        Map<String, Object> detail = (Map<String, Object>) crm.contact(email).getEntity();
        @SuppressWarnings("unchecked")
        Map<String, Object> profile = (Map<String, Object>) detail.get("profile");
        assertEquals("@asha.cooks", profile.get("instagramHandle"));
        assertTrue(service.sessionOpen(email, "INSTAGRAM"));
    }

    @Test
    @TestSecurity(user = "ops", roles = "OPERATOR")
    void whatsappSendBlockedWithoutOptIn() {
        long stamp = System.nanoTime();
        String email = "crm14-nooptin-" + stamp + "@example.com";
        crm.createContact(new CrmResource.ContactRequest(email, null, null, null,
                null, null, null, null, null, null));

        DomainException e = assertThrows(DomainException.class, () -> crm.sendMessage(
                new CrmResource.MessageRequest("WHATSAPP", email, "hello", null, null)));
        assertTrue(e.getMessage().contains("opt-in"), e.getMessage());
    }

    @Test
    @TestSecurity(user = "ops", roles = "OPERATOR")
    void openSessionSendSucceedsAndRecordsOutboundInteraction() {
        long stamp = System.nanoTime();
        String email = "crm14-open-" + stamp + "@example.com";
        crm.createContact(new CrmResource.ContactRequest(email, null, null, "919876543210",
                Boolean.TRUE, "qr-scan", null, null, null, null));
        crm.addInteraction(email, new CrmResource.InteractionRequest(
                "WHATSAPP", "INBOUND", "question about delivery", "919876543210"));

        Response r = crm.sendMessage(new CrmResource.MessageRequest(
                "WHATSAPP", email, "yes, we deliver across Kerala", null, null));
        assertEquals(200, r.getStatus());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) r.getEntity();
        assertEquals("demo", body.get("provider"));
        assertEquals(Boolean.TRUE, body.get("sessionOpen"));
        assertNotNull(body.get("interactionId"));
        assertTrue(body.get("providerRef").toString().startsWith("demo-"), body.get("providerRef").toString());

        @SuppressWarnings("unchecked")
        Map<String, Object> detail = (Map<String, Object>) crm.contact(email).getEntity();
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> interactions = (List<Map<String, Object>>) detail.get("interactions");
        assertEquals("yes, we deliver across Kerala", interactions.get(0).get("body"), "newest first");
        assertEquals("OUTBOUND", interactions.get(0).get("direction"));
        assertEquals("WHATSAPP", interactions.get(0).get("channel"));
        assertEquals("ops", interactions.get(0).get("author"));
    }

    @Test
    @TestSecurity(user = "ops", roles = "OPERATOR")
    void closedSessionRequiresTemplateName() {
        long stamp = System.nanoTime();
        String email = "crm14-closed-" + stamp + "@example.com";
        crm.createContact(new CrmResource.ContactRequest(email, null, null, "919876543210",
                Boolean.TRUE, "qr-scan", null, null, null, null));

        DomainException e = assertThrows(DomainException.class, () -> crm.sendMessage(
                new CrmResource.MessageRequest("WHATSAPP", email, "free-form nudge", null, null)));
        assertTrue(e.getMessage().contains("session closed"), e.getMessage());

        Response r = crm.sendMessage(new CrmResource.MessageRequest(
                "WHATSAPP", email, "your batch is pressed", "order_update", List.of("FB-100")));
        assertEquals(200, r.getStatus());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) r.getEntity();
        assertEquals(Boolean.FALSE, body.get("sessionOpen"));

        @SuppressWarnings("unchecked")
        Map<String, Object> detail = (Map<String, Object>) crm.contact(email).getEntity();
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> interactions = (List<Map<String, Object>>) detail.get("interactions");
        assertEquals("[order_update] your batch is pressed", interactions.get(0).get("body"),
                "template name prefixes the recorded body");
    }

    @Test
    @TestSecurity(user = "ops", roles = "OPERATOR")
    void taskLifecycleWithOverdueFlag() {
        long stamp = System.nanoTime();
        String email = "crm14-task-" + stamp + "@example.com";
        crm.createContact(new CrmResource.ContactRequest(email, null, null, null,
                null, null, null, null, null, null));
        Instant past = Instant.now().minus(Duration.ofHours(2));

        Response created = crm.createTask(new CrmResource.TaskRequest(email, "follow up on sample", past));
        assertEquals(201, created.getStatus());
        long taskId = ((Number) created.getEntity()).longValue();

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> open = (List<Map<String, Object>>) crm.tasks(true).getEntity();
        Map<String, Object> row = open.stream()
                .filter(t -> ((Number) t.get("id")).longValue() == taskId).findFirst().orElseThrow();
        assertEquals(email, row.get("contactEmail"));
        assertEquals("follow up on sample", row.get("subject"));
        assertEquals(Boolean.FALSE, row.get("done"));
        assertEquals(Boolean.TRUE, row.get("overdue"), "due in the past is overdue");

        Response done = crm.completeTask(taskId);
        assertEquals(200, done.getStatus());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> after = (List<Map<String, Object>>) crm.tasks(true).getEntity();
        assertTrue(after.stream().noneMatch(t -> ((Number) t.get("id")).longValue() == taskId),
                "completed task leaves the open list");
    }

    @Test
    @TestSecurity(user = "ops", roles = "OPERATOR")
    void invalidStatusRejected() {
        DomainException e = assertThrows(DomainException.class, () -> crm.createContact(
                new CrmResource.ContactRequest("crm14-bad-" + System.nanoTime() + "@example.com",
                        null, null, null, null, null, null, null, null, "BOGUS")));
        assertTrue(e.getMessage().contains("unknown status"), e.getMessage());
    }

    @Test
    @TestSecurity(user = "ops", roles = "OPERATOR")
    void patchDoesNotClobberStatusAndOptIn() {
        long stamp = System.nanoTime();
        String email = "crm14-patch-" + stamp + "@example.com";
        crm.createContact(new CrmResource.ContactRequest(email, "Old Name", null, null,
                Boolean.TRUE, "qr-scan", null, "walk-in", "vip", "QUALIFIED"));

        Response patched = crm.patchContact(email, new CrmResource.ContactRequest(
                null, "New Name", null, null, null, null, null, null, null, null));
        assertEquals(200, patched.getStatus());

        @SuppressWarnings("unchecked")
        Map<String, Object> detail = (Map<String, Object>) crm.contact(email).getEntity();
        @SuppressWarnings("unchecked")
        Map<String, Object> profile = (Map<String, Object>) detail.get("profile");
        assertEquals("New Name", profile.get("name"));
        assertEquals("QUALIFIED", profile.get("status"), "status kept when not provided");
        assertEquals(Boolean.TRUE, profile.get("whatsappOptIn"), "opt-in kept when not provided");
        assertEquals("vip", profile.get("tags"));
    }

    @Test
    @TestSecurity(user = "cust", roles = "CUSTOMER")
    void customerRoleForbidden() {
        assertThrows(ForbiddenException.class, () -> crm.contacts(null, null));
        assertThrows(ForbiddenException.class, () -> crm.tasks(true));
        assertThrows(ForbiddenException.class, () -> crm.sendMessage(
                new CrmResource.MessageRequest("WHATSAPP", "x@example.com", "hi", null, null)));
    }

    private static void seedCustomer(String email, long stamp) {
        QuarkusTransaction.requiringNew().run(() -> {
            OilProduct product = new OilProduct();
            product.code = "CRM14-P-" + stamp;
            product.name = "CRM14 Product " + stamp;
            product.oilSource = OilProduct.OilSource.GROUNDNUT;
            product.persist();
            ProductVariant variant = new ProductVariant();
            variant.product = product;
            variant.sku = "CRM14-V-" + stamp;
            variant.sizeMl = 500;
            variant.bottleType = ProductVariant.BottleType.GLASS;
            variant.capType = ProductVariant.CapType.ROPP;
            variant.persist();

            CustomerOrder order = CustomerOrder.place(OrderNo.fresh(), "CRM14 Buyer " + stamp,
                    new EmailAddress(email), "9999999999",
                    new DeliveryAddress("12 MG Road", "Bengaluru", "Karnataka", "560001"),
                    List.of(new CustomerOrder.LineDraft(variant, Quantity.of(1), Money.of(100),
                            GstRate.of(new BigDecimal("20")))));
            order.persist();

            Subscriber.record(email, null).persist();
            LoyaltyAccount account = LoyaltyAccount.open(email);
            account.persist();
            account.adjust(30, "seed");
        });
    }
}
