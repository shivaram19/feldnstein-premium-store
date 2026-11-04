package com.feldnstein.platform.commerce.shared;

/** Validated email address. */
public record EmailAddress(String value) {
    public EmailAddress {
        if (value == null || !value.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$"))
            throw new DomainException("a valid email is required");
    }
}
