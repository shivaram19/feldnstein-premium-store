package com.feldnstein.platform.commerce.cart;

import static org.junit.jupiter.api.Assertions.assertNull;

import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.Test;

@QuarkusTest
class CartServiceTest {

    @Inject CartService carts;

    @Test
    void expiredCartIsDeletedWithoutError() {
        Cart cart = QuarkusTransaction.requiringNew().call(() -> {
            Cart c = Cart.open();
            c.persist();
            return c;
        });
        QuarkusTransaction.requiringNew().run(() ->
                Cart.update("expiresAt = ?1 where token = ?2",
                        Instant.now().minus(1, ChronoUnit.HOURS), cart.token()));

        QuarkusTransaction.requiringNew().run(() -> {
            assertNull(carts.resolve(cart.token()), "expired cart must resolve to nothing");
            assertNull(Cart.findByToken(cart.token()), "expired cart must be deleted");
        });
    }
}
