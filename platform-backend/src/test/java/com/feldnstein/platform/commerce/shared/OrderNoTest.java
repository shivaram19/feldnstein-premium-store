package com.feldnstein.platform.commerce.shared;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class OrderNoTest {

    @Test
    void freshCodeHasSixDigitSuffix() {
        OrderNo no = OrderNo.fresh();
        assertTrue(no.value().matches("ORD-\\d{13}\\d{6}"),
                "order code must carry a 6-digit entropy suffix: " + no.value());
    }

    @Test
    void freshCodesDiffer() {
        assertNotEquals(OrderNo.fresh().value(), OrderNo.fresh().value());
    }

    @Test
    void validationUnchanged() {
        assertEquals("ORD-1793793391320-421507", new OrderNo("ORD-1793793391320-421507").value());
        assertThrows(DomainException.class, () -> new OrderNo("ORD-123"));
        assertThrows(DomainException.class, () -> new OrderNo(null));
    }
}
