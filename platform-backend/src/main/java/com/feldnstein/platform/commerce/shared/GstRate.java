package com.feldnstein.platform.commerce.shared;

import java.math.BigDecimal;

/** GST percentage — 0 to 100. */
public record GstRate(BigDecimal percent) {

    private static final GstRate ZERO = new GstRate(BigDecimal.ZERO);

    public GstRate {
        if (percent == null || percent.signum() < 0 || percent.compareTo(BigDecimal.valueOf(100)) > 0)
            throw new DomainException("GST rate must be between 0 and 100");
    }

    public static GstRate of(BigDecimal percent) {
        return percent == null ? ZERO : new GstRate(percent);
    }
}
