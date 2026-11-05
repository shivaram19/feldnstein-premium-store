package com.feldnstein.platform.crm;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.feldnstein.platform.commerce.order.CustomerOrder;
import com.feldnstein.platform.commerce.shared.DeliveryAddress;
import com.feldnstein.platform.commerce.shared.EmailAddress;
import com.feldnstein.platform.commerce.shared.GstRate;
import com.feldnstein.platform.commerce.shared.Money;
import com.feldnstein.platform.commerce.shared.OrderNo;
import com.feldnstein.platform.commerce.shared.Quantity;
import com.feldnstein.platform.gaanugu.catalog.OilProduct;
import com.feldnstein.platform.gaanugu.catalog.ProductVariant;
import com.feldnstein.platform.loyalty.LoyaltyAccount;
import com.feldnstein.platform.loyalty.LoyaltyTransaction;
import com.feldnstein.platform.marketing.Subscriber;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.Response;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

@QuarkusTest
class CrmResourceTest {

    @Inject CrmResource crm;

    @Test
    @TestSecurity(user = "ops", roles = "OPERATOR")
    void aggregatesSpendPointsAndSubscription() {
        long stamp = System.nanoTime();
        String email = "crm-" + stamp + "@example.com";
        seedCustomer(email, stamp);

        Response all = crm.customers(null);
        assertEquals(200, all.getStatus());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) all.getEntity();
        @SuppressWarnings("unchecked")
        Map<String, Object> row = rows.stream()
                .filter(r -> r.get("email").equals(email))
                .findFirst().orElseThrow();
        assertEquals("CRM Buyer " + stamp, row.get("name"), "latest order's name");
        assertEquals(1, row.get("ordersCount"));
        assertEquals(12000L, row.get("totalSpendPaise"), "₹120.00 in paise");
        assertEquals(30, row.get("points"));
        assertEquals(Boolean.TRUE, row.get("subscribed"));
        assertNotNull(row.get("lastOrderAt"));

        Response filtered = crm.customers(email.substring(0, 12));
        assertEquals(200, filtered.getStatus());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> found = (List<Map<String, Object>>) filtered.getEntity();
        assertTrue(found.stream().anyMatch(r -> r.get("email").equals(email)), "q filter matches the email");

        Response nobody = crm.customers("no-such-customer-" + stamp);
        assertEquals(200, nobody.getStatus());
        assertTrue(((List<?>) nobody.getEntity()).isEmpty());
    }

    @Test
    @TestSecurity(user = "admin", roles = "ADMIN")
    void detailAggregatesOrdersLoyaltyAndSubscription() {
        long stamp = System.nanoTime();
        String email = "crmdetail-" + stamp + "@example.com";
        seedCustomer(email, stamp);

        Response r = crm.customer(email);
        assertEquals(200, r.getStatus());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) r.getEntity();
        @SuppressWarnings("unchecked")
        Map<String, Object> profile = (Map<String, Object>) body.get("profile");
        assertEquals(email, profile.get("email"));
        assertEquals(1, profile.get("ordersCount"));
        assertEquals(12000L, profile.get("totalSpendPaise"));
        assertEquals(30, profile.get("points"));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> orders = (List<Map<String, Object>>) body.get("orders");
        assertEquals(1, orders.size());
        assertEquals("PENDING", orders.get(0).get("status"));
        assertEquals(0, new BigDecimal("120.00").compareTo((BigDecimal) orders.get(0).get("grandTotal")));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> txs = (List<Map<String, Object>>) body.get("loyaltyTransactions");
        assertEquals(1, txs.size());
        assertEquals("ADJUST", txs.get(0).get("type"));
        assertEquals(30, txs.get(0).get("points"));

        @SuppressWarnings("unchecked")
        Map<String, Object> subscription = (Map<String, Object>) body.get("subscription");
        assertEquals(Boolean.TRUE, subscription.get("subscribed"));
        assertEquals("storefront", subscription.get("source"));

        Response missing = crm.customer("ghost-" + stamp + "@example.com");
        assertEquals(404, missing.getStatus());
    }

    private static void seedCustomer(String email, long stamp) {
        QuarkusTransaction.requiringNew().run(() -> {
            OilProduct product = new OilProduct();
            product.code = "CRM-P-" + stamp;
            product.name = "CRM Product " + stamp;
            product.oilSource = OilProduct.OilSource.GROUNDNUT;
            product.persist();
            ProductVariant variant = new ProductVariant();
            variant.product = product;
            variant.sku = "CRM-V-" + stamp;
            variant.sizeMl = 500;
            variant.bottleType = ProductVariant.BottleType.GLASS;
            variant.capType = ProductVariant.CapType.ROPP;
            variant.persist();

            CustomerOrder order = CustomerOrder.place(OrderNo.fresh(), "CRM Buyer " + stamp,
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
