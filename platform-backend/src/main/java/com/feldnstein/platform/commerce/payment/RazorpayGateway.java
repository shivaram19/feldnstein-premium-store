package com.feldnstein.platform.commerce.payment;

import com.feldnstein.platform.commerce.order.CustomerOrder;
import com.feldnstein.platform.commerce.shared.DomainException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Razorpay adapter — the production gateway (anti-corruption layer).
 *
 * Flow: {@link #initiate} creates a Razorpay order (server-side, REST v1) and
 * stores its id on the payment; the storefront opens Razorpay Checkout with the
 * key + order id; the callback's HMAC-SHA256 signature is verified in
 * {@link #verifyAndCapture} before the payment is marked paid; refunds go
 * through the Payments API. Requires payment.provider=razorpay and both keys.
 */
@ApplicationScoped
public class RazorpayGateway implements PaymentGateway {

    static final String API_BASE = "https://api.razorpay.com/v1";

    @ConfigProperty(name = "payment.razorpay.key-id")
    java.util.Optional<String> keyId;

    @ConfigProperty(name = "payment.razorpay.key-secret")
    java.util.Optional<String> keySecret;

    @Inject ObjectMapper mapper;

    private final HttpClient http = HttpClient.newHttpClient();

    public boolean configured() {
        return keyId.filter(k -> !k.isBlank()).isPresent()
                && keySecret.filter(k -> !k.isBlank()).isPresent();
    }

    @Override
    public Payment.Provider provider() {
        return Payment.Provider.RAZORPAY;
    }

    @Override
    public Payment initiate(CustomerOrder order) {
        if (!configured())
            throw new DomainException("razorpay is not configured (payment.razorpay.key-id / key-secret are missing)");
        ObjectNode body = mapper.createObjectNode()
                .put("amount", order.grandTotal().amount().movePointRight(2).longValueExact())
                .put("currency", "INR")
                .put("receipt", order.orderCode())
                .put("payment_capture", 1); // auto-capture on success
        JsonNode created = post("/orders", body);
        String razorpayOrderId = created.path("id").asText();
        if (razorpayOrderId.isBlank())
            throw new DomainException("razorpay did not return an order id");

        Payment p = Payment.initiate(order, Payment.Provider.RAZORPAY);
        p.assignProviderRef(razorpayOrderId);
        p.rawJson(created.toString().length() > 3900 ? created.toString().substring(0, 3900) : created.toString());
        p.persist();
        return p;
    }

    @Override
    public CheckoutParams checkoutParams(CustomerOrder order, Payment payment) {
        return new CheckoutParams("RAZORPAY", keyId.orElse(""), payment.providerRef(),
                payment.amount().movePointRight(2).longValueExact(), "INR",
                order.orderCode(), order.grandTotal().amount().movePointRight(2).longValueExact(),
                checkoutNote());
    }

    @Override
    public Payment capture(Payment payment) {
        // Razorpay auto-captures (payment_capture=1); server capture is a no-op here.
        if (payment.status() == Payment.Status.PAID) return payment;
        throw new DomainException(
                "razorpay payments are captured by the checkout callback — use the verify endpoint");
    }

    @Override
    public Payment verifyAndCapture(Payment payment, String paymentId, String signature) {
        if (payment.status() == Payment.Status.PAID) return payment;
        new RazorpaySignature(payment.providerRef(), paymentId, signature).requireValid(keySecret.orElse(""));
        payment.markPaid(Instant.now(),
                "{\"mode\":\"razorpay\",\"captured\":true,\"paymentId\":\"" + paymentId + "\"}");
        return payment;
    }

    @Override
    public Payment refund(Payment payment) {
        if (payment.status() != Payment.Status.PAID) return payment;
        // paymentId is recorded in raw_json at verify time
        String paymentId = extractPaymentId(payment);
        if (!paymentId.isBlank() && configured()) {
            post("/payments/" + paymentId + "/refund", mapper.createObjectNode());
        }
        payment.refund(Instant.now());
        return payment;
    }

    @Override
    public String checkoutNote() {
        return "Secure payment via Razorpay (UPI, cards, netbanking).";
    }

    private String extractPaymentId(Payment payment) {
        try {
            JsonNode raw = mapper.readTree(payment.rawJson() == null ? "{}" : payment.rawJson());
            return raw.path("paymentId").asText("");
        } catch (IOException e) {
            return "";
        }
    }

    private JsonNode post(String path, ObjectNode body) {
        try {
            String auth = Base64.getEncoder()
                    .encodeToString((keyId.get() + ":" + keySecret.get()).getBytes(StandardCharsets.UTF_8));
            HttpRequest req = HttpRequest.newBuilder(URI.create(API_BASE + path))
                    .header("Authorization", "Basic " + auth)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body.toString(), StandardCharsets.UTF_8))
                    .build();
            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
            JsonNode json = mapper.readTree(res.body());
            if (res.statusCode() >= 400) {
                String desc = json.path("error").path("description").asText("razorpay error " + res.statusCode());
                throw new DomainException("razorpay: " + desc);
            }
            return json;
        } catch (IOException e) {
            throw new DomainException("could not reach razorpay — try again in a moment");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new DomainException("payment request interrupted");
        }
    }

    /** Configured and selected — exposed for health/verification logging. */
    public Map<String, Object> diagnostics() {
        return Map.of("provider", "razorpay", "configured", configured(), "keyId", keyId.map(k -> k.substring(0, Math.min(4, k.length())) + "…").orElse(""));
    }
}
