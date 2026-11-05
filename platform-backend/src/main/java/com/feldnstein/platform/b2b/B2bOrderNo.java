package com.feldnstein.platform.b2b;

import java.time.Instant;
import java.util.concurrent.ThreadLocalRandom;

/** Wholesale order number, e.g. B2B-1793793391320421507-482913. Unique and unguessable-ish. */
public record B2bOrderNo(String value) {

    public static final String PREFIX = "B2B-";

    public B2bOrderNo {
        if (value == null || !value.startsWith(PREFIX) || value.length() < PREFIX.length() + 4)
            throw new com.feldnstein.platform.commerce.shared.DomainException("invalid wholesale order number");
    }

    public static B2bOrderNo fresh() {
        return new B2bOrderNo(PREFIX + Instant.now().toEpochMilli() + "-"
                + String.format("%06d", ThreadLocalRandom.current().nextInt(1_000_000)));
    }
}
