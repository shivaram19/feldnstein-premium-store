package com.feldnstein.platform.commerce.shared;

import java.time.Instant;
import java.util.concurrent.ThreadLocalRandom;

/** Customer-facing order code, e.g. ORD-1793793391320-42. Unique and unguessable-ish. */
public record OrderNo(String value) {

    public static final String PREFIX = "ORD-";

    public OrderNo {
        if (value == null || !value.startsWith(PREFIX) || value.length() < PREFIX.length() + 4)
            throw new DomainException("invalid order code");
    }

    public static OrderNo fresh() {
        return new OrderNo(PREFIX + Instant.now().toEpochMilli() + ThreadLocalRandom.current().nextInt(100));
    }
}
