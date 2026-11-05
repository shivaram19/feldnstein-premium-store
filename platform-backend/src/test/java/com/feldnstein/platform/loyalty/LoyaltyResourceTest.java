package com.feldnstein.platform.loyalty;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.feldnstein.platform.commerce.cart.ShopResource;
import com.feldnstein.platform.commerce.order.CustomerOrder;
import com.feldnstein.platform.commerce.shared.DeliveryAddress;
import com.feldnstein.platform.commerce.shared.EmailAddress;
import com.feldnstein.platform.commerce.shared.GstRate;
import com.feldnstein.platform.commerce.shared.Money;
import com.feldnstein.platform.commerce.shared.OrderNo;
import com.feldnstein.platform.commerce.shared.Quantity;
import com.feldnstein.platform.gaanugu.catalog.OilProduct;
import com.feldnstein.platform.gaanugu.catalog.ProductVariant;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.security.ForbiddenException;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.Response;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

@QuarkusTest
class LoyaltyResourceTest {

    @Inject LoyaltyResource loyaltyAdmin;
    @Inject ShopResource shop;

    @Test
    @TestSecurity(user = "ops", roles = "OPERATOR")
    void accountsListAndSearchOpenForOperator() {
        String email = "opslist-" + System.nanoTime() + "@example.com";
        QuarkusTransaction.requiringNew().run(() -> LoyaltyAccount.open(email).persist());

        Response all = loyaltyAdmin.accounts(null);
        assertEquals(200, all.getStatus());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) all.getEntity();
        assertTrue(rows.stream().anyMatch(r -> r.get("email").equals(email)), "seeded account is listed");

        Response filtered = loyaltyAdmin.accounts(email.substring(0, 10));
        assertEquals(200, filtered.getStatus());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> found = (List<Map<String, Object>>) filtered.getEntity();
        assertTrue(found.stream().allMatch(r -> r.get("email").toString().contains(email.substring(0, 10))));
    }

    @Test
    @TestSecurity(user = "admin", roles = "ADMIN")
    void adjustAsAdminWritesAdjustTransaction() {
        String email = "adminadj-" + System.nanoTime() + "@example.com";
        Long id = QuarkusTransaction.requiringNew().call(() -> {
            LoyaltyAccount account = LoyaltyAccount.open(email);
            account.persist();
            return account.id;
        });

        Response r = loyaltyAdmin.adjust(id, new LoyaltyResource.AdjustRequest(25, "test goodwill"));
        assertEquals(200, r.getStatus());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) r.getEntity();
        assertEquals(25, body.get("balance"));

        QuarkusTransaction.requiringNew().run(() -> {
            LoyaltyAccount account = LoyaltyAccount.findById(id);
            assertEquals(25, account.pointsBalance());
            LoyaltyTransaction tx = LoyaltyTransaction.<LoyaltyTransaction>streamAll()
                    .filter(t -> t.type() == LoyaltyTransaction.Type.ADJUST)
                    .filter(t -> t.account().id.equals(id)).findFirst().orElseThrow();
            assertEquals("test goodwill", tx.reason());
        });
    }

    @Test
    @TestSecurity(user = "ops", roles = "OPERATOR")
    void adjustForbiddenForOperator() {
        assertThrows(ForbiddenException.class, () ->
                loyaltyAdmin.adjust(1L, new LoyaltyResource.AdjustRequest(5, "nope")));
    }

    @Test
    @TestSecurity(user = "cust", roles = "CUSTOMER")
    void adjustForbiddenForCustomer() {
        assertThrows(ForbiddenException.class, () ->
                loyaltyAdmin.adjust(1L, new LoyaltyResource.AdjustRequest(5, "nope")));
    }

    @Test
    void balanceEndpointRequiresOrderMatchingEmail() {
        long stamp = System.nanoTime();
        ProductVariant variant = QuarkusTransaction.requiringNew().call(() -> {
            OilProduct product = new OilProduct();
            product.code = "BAL-P-" + stamp;
            product.name = "Balance Product " + stamp;
            product.oilSource = OilProduct.OilSource.GROUNDNUT;
            product.persist();
            ProductVariant v = new ProductVariant();
            v.product = product;
            v.sku = "BAL-V-" + stamp;
            v.sizeMl = 500;
            v.bottleType = ProductVariant.BottleType.GLASS;
            v.capType = ProductVariant.CapType.ROPP;
            v.persist();
            return v;
        });
        String email = "balance-" + stamp + "@example.com";
        CustomerOrder order = QuarkusTransaction.requiringNew().call(() -> {
            CustomerOrder o = CustomerOrder.place(OrderNo.fresh(), "Balance Buyer",
                    new EmailAddress(email), "9999999999",
                    new DeliveryAddress("12 MG Road", "Bengaluru", "Karnataka", "560001"),
                    List.of(new CustomerOrder.LineDraft(variant, Quantity.of(1), Money.of(100),
                            GstRate.of(BigDecimal.ZERO))));
            o.persistAndFlush();
            return o;
        });
        QuarkusTransaction.requiringNew().run(() -> loyaltyAdjust(email, 40));

        Response ok = shop.loyaltyBalance(email, order.orderCode());
        assertEquals(200, ok.getStatus());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) ok.getEntity();
        assertEquals(40, body.get("balance"));
        assertEquals(0, body.get("lifetimeEarned"), "adjustments are not earned points");
        assertEquals(email, body.get("email"));

        Response wrongEmail = shop.loyaltyBalance("intruder@example.com", order.orderCode());
        assertEquals(404, wrongEmail.getStatus(), "wrong email must not leak the balance");
        Response wrongCode = shop.loyaltyBalance(email, "ORD-000000000000000000");
        assertEquals(404, wrongCode.getStatus());
        Response missing = shop.loyaltyBalance(null, order.orderCode());
        assertEquals(400, missing.getStatus());
    }

    private static void loyaltyAdjust(String email, int points) {
        LoyaltyAccount account = LoyaltyAccount.findByEmail(email);
        if (account == null) { account = LoyaltyAccount.open(email); account.persist(); }
        account.adjust(points, "seed");
    }
}
