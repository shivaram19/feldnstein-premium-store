package com.feldnstein.platform.commerce.payment;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;

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
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

@QuarkusTest
class PaymentServiceTest {

    @Inject PaymentService payments;

    @Test
    void paymentArrivingAfterCancelIsRefunded() {
        long stamp = System.nanoTime();
        ProductVariant variant = persistVariant(stamp);

        QuarkusTransaction.requiringNew().run(() -> {
            CustomerOrder order = placeOrder(variant, stamp);
            payments.initiate(order);
            order.cancel(Instant.now(), "changed my mind");

            payments.verifyPayment(order, "pay_late_" + stamp, "sig");

            assertEquals(CustomerOrder.Status.CANCELLED, order.status(), "order must stay cancelled");
            Payment p = Payment.findByOrder(order);
            assertEquals(Payment.Status.REFUNDED, p.status(), "captured money must be refunded, not orphaned");
        });
    }

    @Test
    void secondVerifyAfterSuccessReturnsOrder() {
        long stamp = System.nanoTime();
        ProductVariant variant = persistVariant(stamp);

        QuarkusTransaction.requiringNew().run(() -> {
            CustomerOrder order = placeOrder(variant, stamp);
            payments.initiate(order);

            CustomerOrder first = payments.verifyPayment(order, "pay_a_" + stamp, "sig");
            assertEquals(CustomerOrder.Status.PAID, first.status());

            CustomerOrder second = payments.verifyPayment(order, "pay_b_" + stamp, "sig");
            assertSame(order, second);
            assertEquals(CustomerOrder.Status.PAID, second.status());
            assertEquals(Payment.Status.PAID, Payment.findByOrder(order).status());
        });
    }

    private static CustomerOrder placeOrder(ProductVariant variant, long stamp) {
        CustomerOrder order = CustomerOrder.place(OrderNo.fresh(), "Pay Buyer", new EmailAddress("pay@example.com"),
                "9999999999", new DeliveryAddress("22 FC Road", "Pune", "Maharashtra", "411005"),
                List.of(new CustomerOrder.LineDraft(variant, Quantity.of(1), Money.of(200),
                        GstRate.of(BigDecimal.ZERO))));
        order.persist();
        return order;
    }

    private static ProductVariant persistVariant(long stamp) {
        return QuarkusTransaction.requiringNew().call(() -> {
            OilProduct product = new OilProduct();
            product.code = "PAY-P-" + stamp;
            product.name = "Pay Product " + stamp;
            product.oilSource = OilProduct.OilSource.COCONUT;
            product.persist();

            ProductVariant variant = new ProductVariant();
            variant.product = product;
            variant.sku = "PAY-V-" + stamp;
            variant.sizeMl = 250;
            variant.bottleType = ProductVariant.BottleType.GLASS;
            variant.capType = ProductVariant.CapType.LUG;
            variant.persist();
            return variant;
        });
    }
}
