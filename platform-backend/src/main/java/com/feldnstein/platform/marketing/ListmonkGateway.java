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
        HttpResponse<String> res = post("/api/subscribers", body);
        if (res.statusCode() == 409) return; // already subscribed — idempotent success
        if (res.statusCode() >= 400)
            throw new DomainException("listmonk: " + providerMessage(res.body(), res.statusCode()));
    }

    /**
     * Listmonk campaign — create-and-send against the configured list, best-effort:
     * create the campaign, flip it to scheduled. API failures surface as a
     * {@link DomainException} with the provider's message; the send is recorded
     * locally only on success.
     */
    @Override
    @jakarta.transaction.Transactional
    public void sendCampaign(String name, String subject, String body, int recipientCount) {
        if (!configured())
            throw new DomainException("listmonk is not configured (listmonk.api-token is missing)");
        if (listIds().isEmpty())
            throw new DomainException("listmonk.list-ids is required to send a campaign");
        ObjectNode payload = mapper.createObjectNode()
                .put("name", name)
                .put("subject", subject)
                .put("body", body)
                .put("content_type", "html")
                .put("type", "regular");
        ArrayNode lists = payload.putArray("lists");
        listIds().forEach(lists::add);
        HttpResponse<String> created = post("/api/campaigns", payload);
        if (created.statusCode() >= 400)
            throw new DomainException("listmonk: " + providerMessage(created.body(), created.statusCode()));
        try {
            long id = mapper.readTree(created.body()).path("data").path("id").asLong(-1);
            if (id >= 0) {
                HttpResponse<String> scheduled = post("/api/campaigns/" + id + "/status",
                        mapper.createObjectNode().put("status", "scheduled"));
                if (scheduled.statusCode() >= 400)
                    throw new DomainException("listmonk: " + providerMessage(scheduled.body(), scheduled.statusCode()));
            }
        } catch (IOException e) {
            throw new DomainException("could not read listmonk campaign response");
        }
        Campaign.record(name, subject, body, Campaign.Status.SENT,
                recipientCount, "listmonk", java.time.Instant.now()).persist();
    }

    private HttpResponse<String> post(String path, ObjectNode body) {
        try {
            HttpRequest req = HttpRequest.newBuilder(URI.create(baseUrl + path))
                    .header("Authorization", "token " + apiToken.get().trim())
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body.toString(), StandardCharsets.UTF_8))
                    .build();
            return http.send(req, HttpResponse.BodyHandlers.ofString());
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
