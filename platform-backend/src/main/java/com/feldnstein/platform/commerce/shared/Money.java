package com.feldnstein.platform.commerce.shared;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

/**
 * Money in INR — immutable, non-negative, max two decimals.
 * Arithmetic lives here so pricing rules have one home.
 */
public record Money(BigDecimal amount) {

    public static final Money ZERO = new Money(BigDecimal.ZERO.setScale(2, RoundingMode.UNNECESSARY));

    public Money {
        Objects.requireNonNull(amount, "amount");
        if (amount.signum() < 0) throw new DomainException("amount cannot be negative");
        if (amount.stripTrailingZeros().scale() > 2)
            throw new DomainException("amount cannot have more than two decimals");
    }

    public static Money of(BigDecimal amount) {
        return new Money(amount.setScale(2, RoundingMode.HALF_UP));
    }

    public static Money of(long rupees) {
        return new Money(BigDecimal.valueOf(rupees).setScale(2, RoundingMode.HALF_UP));
    }

    public Money plus(Money other) {
        return of(amount.add(other.amount));
    }

    public Money times(Quantity qty) {
        return of(amount.multiply(BigDecimal.valueOf(qty.value())));
    }

    /** GST portion at the given rate (rounded half-up to paise). */
    public Money gstAt(GstRate rate) {
        return of(amount.multiply(rate.percent()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP));
    }

    public boolean isZero() {
        return amount.signum() == 0;
    }
}
