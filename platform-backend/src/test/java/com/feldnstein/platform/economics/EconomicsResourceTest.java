package com.feldnstein.platform.economics;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.feldnstein.platform.commerce.shared.DomainException;
import com.feldnstein.platform.economics.EconomicsResource.ByproductSaleRequest;
import com.feldnstein.platform.economics.EconomicsResource.ParamsRequest;
import com.feldnstein.platform.economics.EconomicsResource.PriceRuleRequest;
import com.feldnstein.platform.economics.EconomicsResource.SaleView;
import com.feldnstein.platform.economics.EconomicsService.MaterialSource;
import com.feldnstein.platform.economics.EconomicsService.Snapshot;
import io.quarkus.security.ForbiddenException;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.Response;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

@QuarkusTest
class EconomicsResourceTest {

    @Inject EconomicsResource resource;

    @Test
    @TestSecurity(user = "admin", roles = "ADMIN")
    void putUpsertsParamsIdempotently() {
        long productId = EconomicsServiceTest.newProduct("GROUNDNUT");
        ParamsRequest body = new ParamsRequest(3, new BigDecimal("0.40"), new BigDecimal("12"),
                new BigDecimal("130"), new BigDecimal("1000"), 313, new BigDecimal("40000"),
                new BigDecimal("30"), 100L, new BigDecimal("144000"), new BigDecimal("740000"), 3);

        Response first = resource.upsertParams(productId, body);
        Response second = resource.upsertParams(productId, body);
        assertEquals(200, first.getStatus());
        assertEquals(200, second.getStatus());

        Snapshot snapshot = (Snapshot) resource.product(productId).getEntity();
        assertEquals(3, snapshot.params().tripsPerDay());
        assertEquals(MaterialSource.OVERRIDE, snapshot.params().materialCostSource());
        assertEquals(3, snapshot.params().depreciationYears());

        assertEquals(1, ProductEconomics.count("product.id", productId),
                "repeated PUT keeps a single params row");
    }

    @Test
    @TestSecurity(user = "ops", roles = "OPERATOR")
    void productsListSnapshotsEveryConfiguredProduct() {
        long productId = EconomicsServiceTest.newProduct("SESAME");
        resource.upsertParams(productId, new ParamsRequest(1, new BigDecimal("0.5"), new BigDecimal("10"),
                new BigDecimal("100"), BigDecimal.ZERO, 365, BigDecimal.ZERO, BigDecimal.ZERO, 0L,
                BigDecimal.ZERO, BigDecimal.ZERO, 1));

        @SuppressWarnings("unchecked")
        List<Snapshot> rows = (List<Snapshot>) resource.products().getEntity();
        assertTrue(rows.stream().anyMatch(r -> r.productId() == productId));
    }

    @Test
    @TestSecurity(user = "admin", roles = "ADMIN")
    void priceRuleEndpointValidatesMargins() {
        long productId = EconomicsServiceTest.newProduct("COCONUT");
        assertThrows(DomainException.class, () -> resource.setPriceRule(
                new PriceRuleRequest(productId, new BigDecimal("0.25"), new BigDecimal("0.25"))));
        assertThrows(DomainException.class, () -> resource.setPriceRule(
                new PriceRuleRequest(productId, BigDecimal.ONE, new BigDecimal("0.5"))));

        PriceRule rule = (PriceRule) resource.setPriceRule(
                new PriceRuleRequest(productId, new BigDecimal("0.25"), new BigDecimal("0.05"))).getEntity();
        assertEquals(0, new BigDecimal("0.25").compareTo(rule.targetMarginPct));
        assertEquals(0, new BigDecimal("0.05").compareTo(rule.minMarginPct));
    }

    @Test
    @TestSecurity(user = "ops", roles = "OPERATOR")
    void byproductSaleEndpointRecordsAndLists() {
        long productId = EconomicsServiceTest.newProduct("GROUNDNUT");
        EconomicsServiceTest.batch(productId, "100.00");

        assertThrows(DomainException.class, () -> resource.recordByproductSale(
                new ByproductSaleRequest(productId, BigDecimal.ZERO, 100L, null, null, null)));

        SaleView sale = (SaleView) resource.recordByproductSale(
                new ByproductSaleRequest(productId, new BigDecimal("50"), 400000L, "E2E Buyer", null, null))
                .getEntity();
        assertTrue(sale.id() > 0);
        assertEquals("E2E Buyer", sale.buyer());

        @SuppressWarnings("unchecked")
        List<SaleView> rows = (List<SaleView>) resource.byproductSales(productId).getEntity();
        assertTrue(rows.stream().anyMatch(r -> "E2E Buyer".equals(r.buyer())));
    }

    @Test
    @TestSecurity(user = "cust", roles = "CUSTOMER")
    void customerRoleIsRejected() {
        assertThrows(ForbiddenException.class, this::callProducts);
    }

    private void callProducts() {
        resource.products();
    }
}
