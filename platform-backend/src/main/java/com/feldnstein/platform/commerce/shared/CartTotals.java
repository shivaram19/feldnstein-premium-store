package com.feldnstein.platform.commerce.shared;

/** Totals breakdown of a cart or an order — computed, never stored wrong. */
public record CartTotals(Money subTotal, Money gstTotal, Money grandTotal, int itemCount) {

    public static CartTotals empty() {
        return new CartTotals(Money.ZERO, Money.ZERO, Money.ZERO, 0);
    }
}
