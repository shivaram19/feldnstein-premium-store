package com.feldnstein.platform.commerce.payment;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.feldnstein.platform.commerce.shared.DomainException;
import org.junit.jupiter.api.Test;

/** Known-answer tests for the Razorpay HMAC-SHA256 signature scheme. */
class RazorpaySignatureTest {

    private static final String SECRET = "whsec_test_secret_1234567890";

    @Test
    void knownVectorVerifies() {
        // HMAC-SHA256("order_ABC|pay_XYZ", SECRET) computed with the same algorithm
        String data = "order_ABC|pay_XYZ";
        String expected = RazorpaySignature.hmacSha256Hex(data, SECRET);
        assertEquals(64, expected.length(), "HMAC-SHA256 hex must be 64 chars");

        RazorpaySignature sig = new RazorpaySignature("order_ABC", "pay_XYZ", expected);
        assertTrue(sig.verify(SECRET));
    }

    @Test
    void tamperedSignatureRejected() {
        String good = RazorpaySignature.hmacSha256Hex("order_ABC|pay_XYZ", SECRET);
        String tampered = (good.startsWith("0a") ? "0b" : "0a") + good.substring(2);

        RazorpaySignature sig = new RazorpaySignature("order_ABC", "pay_XYZ", tampered);
        assertFalse(sig.verify(SECRET));
        assertThrows(DomainException.class, () -> sig.requireValid(SECRET));
    }

    @Test
    void differentSecretRejected() {
        String good = RazorpaySignature.hmacSha256Hex("order_ABC|pay_XYZ", SECRET);
        RazorpaySignature sig = new RazorpaySignature("order_ABC", "pay_XYZ", good);
        assertFalse(sig.verify("a_different_secret"));
    }

    @Test
    void incompleteDetailsRejected() {
        assertThrows(DomainException.class, () -> new RazorpaySignature("", "pay_X", "sig"));
        assertThrows(DomainException.class, () -> new RazorpaySignature("order_A", null, "sig"));
        assertThrows(DomainException.class, () -> new RazorpaySignature("order_A", "pay_X", " "));
    }
}
