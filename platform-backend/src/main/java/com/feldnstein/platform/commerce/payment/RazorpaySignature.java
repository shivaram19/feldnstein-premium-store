package com.feldnstein.platform.commerce.payment;

import com.feldnstein.platform.commerce.shared.DomainException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/**
 * Razorpay callback signature — HMAC-SHA256 of "{orderId}|{paymentId}" hex-encoded,
 * computed with the key secret. Verification is constant-time.
 */
public record RazorpaySignature(String orderId, String paymentId, String signature) {

    public RazorpaySignature {
        if (isBlank(orderId) || isBlank(paymentId) || isBlank(signature))
            throw new DomainException("payment verification details are incomplete");
    }

    public boolean verify(String keySecret) {
        String expected = hmacSha256Hex(orderId + "|" + paymentId, keySecret);
        return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8),
                signature.trim().getBytes(StandardCharsets.UTF_8));
    }

    public void requireValid(String keySecret) {
        if (!verify(keySecret))
            throw new DomainException("payment signature verification failed");
    }

    static String hmacSha256Hex(String data, String secret) {
        try {
            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
            mac.init(new javax.crypto.spec.SecretKeySpec(
                    secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(hash.length * 2);
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (java.security.GeneralSecurityException e) {
            throw new IllegalStateException("HMAC-SHA256 unavailable", e);
        }
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    static {
        // fail fast if the JRE lacks SHA-256 (it never does, but the dependency is explicit)
        try {
            MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
