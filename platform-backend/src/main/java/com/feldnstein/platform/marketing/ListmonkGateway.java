package com.feldnstein.platform.marketing;

import com.feldnstein.platform.commerce.shared.DomainException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Listmonk adapter — the production newsletter gateway (anti-corruption layer)
 * over the Listmonk REST API. Requires {@code newsletter.provider=listmonk} and
 * {@code listmonk.api-token}; an HTTP 409 (already subscribed) is a success.
 */
@ApplicationScoped
public class ListmonkGateway implements NewsletterGateway {

    @ConfigProperty(name = "listmonk.base-url", defaultValue = "http://localhost:9000")
    String baseUrl;

    @ConfigProperty(name = "listmonk.api-token")
    java.util.Optional<String> apiToken;

    @ConfigProperty(name = "listmonk.list-ids")
    java.util.Optional<String> listIds;

    @Inject ObjectMapper mapper;

    private final HttpClient http = HttpClient.newHttpClient();

    public boolean configured() {
        return apiToken.filter(k -> !k.isBlank()).isPresent();
    }

    @Override
    public void subscribe(String email, String name) {
        if (!configured())
            throw new DomainException("listmonk is not configured (listmonk.api-token is missing)");
        ObjectNode body = buildPayload(mapper, email, name, listIds());
        try {
            HttpRequest req = HttpRequest.newBuilder(URI.create(baseUrl + "/api/subscribers"))
                    .header("Authorization", "token " + apiToken.get().trim())
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body.toString(), StandardCharsets.UTF_8))
                    .build();
            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() == 409) return; // already subscribed — idempotent success
            if (res.statusCode() >= 400)
                throw new DomainException("listmonk: " + providerMessage(res.body(), res.statusCode()));
        } catch (IOException e) {
            throw new DomainException("could not reach listmonk at " + baseUrl
                    + " — check LISTMONK_BASE_URL, or set NEWSLETTER_PROVIDER=demo");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new DomainException("listmonk request interrupted");
        }
    }

    private List<String> listIds() {
        return listIds.filter(s -> !s.isBlank())
                .map(s -> Arrays.stream(s.split(","))
                        .map(String::trim)
                        .filter(t -> !t.isEmpty())
                        .toList())
                .orElse(List.of());
    }

    static ObjectNode buildPayload(ObjectMapper mapper, String email, String name, List<String> listIds) {
        ObjectNode body = mapper.createObjectNode()
                .put("email", email)
                .put("status", "enabled");
        if (name != null && !name.isBlank()) body.put("name", name);
        if (!listIds.isEmpty()) {
            ArrayNode lists = body.putArray("lists");
            listIds.forEach(lists::add);
        }
        return body;
    }

    private String providerMessage(String body, int statusCode) {
        try {
            JsonNode json = mapper.readTree(body);
            String msg = json.path("message").asText("");
            return msg.isBlank() ? "error " + statusCode : msg;
        } catch (Exception e) {
            return "error " + statusCode;
        }
    }
}
