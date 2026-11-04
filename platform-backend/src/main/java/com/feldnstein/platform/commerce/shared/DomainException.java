package com.feldnstein.platform.commerce.shared;

/** Domain rule violation — mapped to a friendly 4xx by the REST adapters. */
public class DomainException extends RuntimeException {
    public DomainException(String message) {
        super(message);
    }
}
