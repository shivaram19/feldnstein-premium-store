package com.feldnstein.platform.marketing;

import com.feldnstein.platform.commerce.shared.DomainException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Instance;
import jakarta.inject.Inject;
import java.util.Map;
import java.util.Set;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Marketing application service — selects the LLM gateway adapter by
 * configuration ({@code ai.provider=ollama|demo}) and validates tasks against
 * the supported set before delegating generation.
 */
@ApplicationScoped
public class MarketingService {

    static final Set<String> TASKS = Set.of(
            "product-description", "hero-copy", "ticker-lines", "testimonial", "email-campaign");

    @ConfigProperty(name = "ai.provider", defaultValue = "demo")
    String provider;

    @Inject Instance<LlmGateway> gateways;
    @Inject OllamaGateway ollama;
    @Inject ObjectMapper mapper;

    private LlmGateway gateway() {
        if ("ollama".equalsIgnoreCase(provider)) return ollama;
        return gateways.stream()
                .filter(g -> g instanceof DemoLlmGateway)
                .findFirst()
                .orElseThrow(() -> new DomainException("no LLM gateway adapter available"));
    }

    /** Selected provider name, surfaced in API responses ("demo" or "ollama"). */
    public String provider() {
        return gateway() instanceof OllamaGateway ? "ollama" : "demo";
    }

    /** Generate copy for a supported task; unknown tasks are a client error. */
    public String generate(String task, Map<String, Object> context) {
        String t = task == null ? "" : task.trim();
        if (!TASKS.contains(t))
            throw new DomainException("unsupported marketing task '" + t
                    + "' — supported: " + String.join(", ", TASKS));
        String contextJson;
        try {
            contextJson = mapper.writeValueAsString(context == null ? Map.of() : context);
        } catch (JsonProcessingException e) {
            throw new DomainException("context is not serializable to JSON: " + e.getMessage());
        }
        return gateway().generate(t, contextJson);
    }
}
