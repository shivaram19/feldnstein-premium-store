package com.feldnstein.platform.crm.messaging;

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
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Meta adapter — the production messaging gateway over Meta's Cloud APIs:
 * WhatsApp Business Platform {@code POST /{phone-number-id}/messages} and
 * Instagram Messaging {@code POST /{ig-id}/messages} on the Graph API. Goes
 * live with {@code messaging.provider=meta} plus all four
 * {@code messaging.meta.*} settings; non-2xx responses raise an actionable
 * {@link DomainException} with Meta's error message. Instagram sends are
 * best-effort with the same 24-hour session rule enforced by the caller.
 *
 * <p>Policy notes: Meta moves WhatsApp to per-message pricing in October
 * 2026 — free-form (session) messages and template messages are priced per
 * delivery, so outbound volume should be watched once live. The 7-day
 * human-agent tag that extends the Instagram reply window is not used here;
 * re-open via a template message instead. Both are intentionally no-code
 * concerns for now (ADR-0019).
 */
@ApplicationScoped
public class MetaMessagingGateway implements MessagingGateway {

    static final String API_BASE = "https://graph.facebook.com/v21.0";

    @ConfigProperty(name = "messaging.meta.whatsapp-phone-number-id")
    Optional<String> whatsappPhoneNumberId;

    @ConfigProperty(name = "messaging.meta.whatsapp-token")
    Optional<String> whatsappToken;

    @ConfigProperty(name = "messaging.meta.instagram-ig-id")
    Optional<String> instagramIgId;

    @ConfigProperty(name = "messaging.meta.instagram-token")
    Optional<String> instagramToken;

    @Inject ObjectMapper mapper;

    String baseUrl = API_BASE;

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(30))
            .build();

    public boolean configured() {
        return present(whatsappPhoneNumberId) && present(whatsappToken)
                && present(instagramIgId) && present(instagramToken);
    }

    private static boolean present(Optional<String> value) {
        return value.filter(s -> !s.isBlank()).isPresent();
    }

    @Override
    public String send(Channel channel, String to, String text, boolean sessionOpen,
                       String templateName, List<String> templateParams) {
        ObjectNode payload = buildPayload(mapper, channel, to, text, sessionOpen, templateName, templateParams);
        String endpoint;
        String token;
        if (channel == Channel.WHATSAPP) {
            endpoint = baseUrl + "/" + whatsappPhoneNumberId.get().trim() + "/messages";
            token = whatsappToken.get().trim();
        } else {
            endpoint = baseUrl + "/" + instagramIgId.get().trim() + "/messages";
            token = instagramToken.get().trim();
        }
        HttpResponse<String> res = post(endpoint, token, payload);
        if (res.statusCode() >= 400)
            throw new DomainException("meta: " + providerMessage(res.body(), res.statusCode()));
        try {
            JsonNode json = mapper.readTree(res.body());
            String id = json.path("messages").path(0).path("id").asText("");
            if (!id.isBlank()) return id;
        } catch (IOException ignored) {
            // a 2xx without a readable message id still means delivered
        }
        return "meta-" + System.currentTimeMillis();
    }

    static ObjectNode buildPayload(ObjectMapper mapper, Channel channel, String to, String text,
                                   boolean sessionOpen, String templateName, List<String> templateParams) {
        ObjectNode body = mapper.createObjectNode();
        if (channel == Channel.WHATSAPP) {
            body.put("messaging_product", "whatsapp").put("to", to);
            if (sessionOpen) {
                body.put("type", "text");
                body.putObject("text").put("body", text);
            } else {
                body.put("type", "template");
                ObjectNode template = body.putObject("template");
                template.put("name", templateName);
                template.putObject("language").put("code", "en");
                ArrayNode components = template.putArray("components");
                ObjectNode component = components.addObject();
                component.put("type", "body");
                ArrayNode parameters = component.putArray("parameters");
                if (templateParams != null) {
                    for (String param : templateParams) {
                        parameters.addObject().put("type", "text").put("text", param == null ? "" : param);
                    }
                }
            }
        } else {
            body.putObject("recipient").put("id", to);
            body.putObject("message").put("text", text);
        }
        return body;
    }

    private HttpResponse<String> post(String url, String token, ObjectNode body) {
        try {
            HttpRequest req = HttpRequest.newBuilder(URI.create(url))
                    .header("Authorization", "Bearer " + token)
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(30))
                    .POST(HttpRequest.BodyPublishers.ofString(body.toString(), StandardCharsets.UTF_8))
                    .build();
            return http.send(req, HttpResponse.BodyHandlers.ofString());
        } catch (IllegalArgumentException e) {
            throw new DomainException("Meta messaging endpoint is malformed — check messaging.meta.* config");
        } catch (IOException e) {
            throw new DomainException("could not reach Meta at " + baseUrl
                    + " — check the network, or set MESSAGING_PROVIDER=demo");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new DomainException("meta messaging request interrupted");
        }
    }

    private String providerMessage(String body, int statusCode) {
        try {
            JsonNode json = mapper.readTree(body);
            String message = json.path("error").path("message").asText("");
            return message.isBlank() ? "error " + statusCode : message;
        } catch (Exception e) {
            return "error " + statusCode;
        }
    }
}
