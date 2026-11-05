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
import java.time.Duration;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Ollama adapter — the production LLM gateway, talking to its OpenAI-compatible
 * chat-completions endpoint. Requires a running Ollama (or any compatible
 * server) at {@code ai.base-url}; goes live with {@code AI_PROVIDER=ollama}.
 * Unreachable or unreadable responses raise an actionable {@link DomainException}.
 */
@ApplicationScoped
public class OllamaGateway implements LlmGateway {

    static final String SYSTEM_PROMPT = """
            You are the copywriter for Feldnstein, a small Indian artisanal oil brand. \
            The oils are bull-driven stone-pressed (gaanugu), cold-pressed in the village \
            of Mothadaka in small unrefined batches. Voice: warm, plain-spoken, specific, \
            quietly proud of the craft. Never use hype words like "revolutionary", \
            "game-changer", "magical" or exclamation marks. Write in Indian English that \
            respects traditional methods.""";

    @ConfigProperty(name = "ai.base-url", defaultValue = "http://localhost:11434")
    String baseUrl;

    @ConfigProperty(name = "ai.model", defaultValue = "llama3.2:3b")
    String model;

    @Inject ObjectMapper mapper = new ObjectMapper();

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(30))
            .build();

    public OllamaGateway() {}

    OllamaGateway(String baseUrl, String model) {
        this.baseUrl = baseUrl;
        this.model = model;
    }

    @Override
    public String generate(String taskPrompt, String contextJson) {
        ObjectNode body = mapper.createObjectNode()
                .put("model", model)
                .put("temperature", 0.7);
        ArrayNode messages = body.putArray("messages");
        messages.addObject().put("role", "system").put("content", SYSTEM_PROMPT);
        messages.addObject().put("role", "user")
                .put("content", taskPrompt + "\n\nContext (JSON):\n" + contextJson);
        try {
            HttpRequest req = HttpRequest.newBuilder(URI.create(baseUrl + "/v1/chat/completions"))
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(30))
                    .POST(HttpRequest.BodyPublishers.ofString(body.toString(), StandardCharsets.UTF_8))
                    .build();
            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
            JsonNode json = mapper.readTree(res.body());
            if (res.statusCode() >= 400) {
                String detail = json.path("error").path("message").asText("ollama error " + res.statusCode());
                throw new DomainException("ollama rejected the request (" + detail
                        + ") — check AI_MODEL, or set AI_PROVIDER=demo");
            }
            String text = json.path("choices").path(0).path("message").path("content").asText("").trim();
            if (text.isBlank())
                throw new DomainException("ollama returned an empty or unreadable response from " + baseUrl
                        + " — check the model name (AI_MODEL), or set AI_PROVIDER=demo");
            return text;
        } catch (IllegalArgumentException e) {
            throw new DomainException("Ollama unreachable at " + baseUrl
                    + " — the URL is malformed; fix AI_BASE_URL, or set AI_PROVIDER=demo");
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw new DomainException("ollama returned an unreadable response from " + baseUrl
                    + " — check the endpoint (AI_BASE_URL), or set AI_PROVIDER=demo");
        } catch (IOException e) {
            throw new DomainException("Ollama unreachable at " + baseUrl
                    + " — start it, or set AI_PROVIDER=demo");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new DomainException("ollama request interrupted");
        }
    }
}
