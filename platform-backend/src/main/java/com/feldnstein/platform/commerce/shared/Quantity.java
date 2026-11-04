package com.feldnstein.platform.commerce.shared;

/** A count of sellable units — never negative. */
public record Quantity(int value) {

    public Quantity {
        if (value < 0) throw new DomainException("quantity cannot be negative");
    }

    public static Quantity of(int value) {
        return new Quantity(value);
    }

    public boolean isZero() {
        return value == 0;
    }
}
