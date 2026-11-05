package com.feldnstein.platform.marketing;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Demo gateway — stands in for a real LLM: renders brand-voice copy from
 * templates, filling placeholders from the task's context JSON. Selected when
 * {@code ai.provider=demo} (the default); fully functional offline, same task
 * contract as the Ollama adapter.
 */
@ApplicationScoped
public class DemoLlmGateway implements LlmGateway {

    private final ObjectMapper mapper = new ObjectMapper();

    @Override
    public String generate(String taskPrompt, String contextJson) {
        JsonNode ctx = parse(contextJson);
        String product = text(ctx, "productName", "our cold-pressed oil");
        String oilType = text(ctx, "oilType", "single-origin seed");
        String sizeMl = text(ctx, "sizeMl", "500");
        String notes = text(ctx, "notes", "mellow and rounded");
        return switch (taskPrompt) {
            case "product-description" -> """
                    At our ghaani in Mothadaka, %s is pressed the slow way. A bull walks the stone gaanugu in
                    circles, crushing %s at its own pace — the same method this village has trusted for
                    generations. The oil is drawn off in small batches and left unrefined, so it keeps the
                    aroma and character that machine pressing cooks away.

                    On the palate it is %s, with a warmth that suits everyday Indian cooking: tempering dal and
                    rasam, finishing hot rice, or kneading into chapati dough. Each %s ml bottle is filled by
                    hand and settles naturally over time — keep it away from heat and light, and use it within
                    a few months, when it tastes best.
                    """.formatted(product, oilType, notes, sizeMl);
            case "hero-copy" -> json(Map.of(
                    "headline", "%s, pressed the slow way".formatted(product),
                    "subcopy", "Bull-driven stone gaanugu in Mothadaka, cold-pressed in small unrefined batches. "
                            + "Cook with oil that still tastes of the seed it came from.")).toString();
            case "ticker-lines" -> jsonLines(List.of(
                    "Pressed slow by bull power",
                    "Single-village oil from Mothadaka",
                    "Unrefined, small-batch, honest",
                    "%s, crushed to order".formatted(capitalize(oilType)))).toString();
            case "testimonial" -> testimonial(product, ctx);
            case "email-campaign" -> """
                    Subject: %s — fresh batch pressed %s

                    Hello,

                    A fresh batch of %s came off the stone this week, pressed slowly by our bull-driven
                    gaanugu in Mothadaka. The batches are small and this one will not stay long.

                    If your bottle is running low, now is the time to reorder — we press to order, and the
                    next despatch goes out within the week.

                    With gratitude,
                    The Feldnstein family
                    Mothadaka
                    """.formatted(product, text(ctx, "batchDate", "this week"), product);
            default -> throw new com.feldnstein.platform.commerce.shared.DomainException(
                    "unsupported marketing task '" + taskPrompt + "'");
        };
    }

    private String testimonial(String product, JsonNode ctx) {
        String[][] voices = {
                {"Lakshmi Venkatesh", "Coimbatore"},
                {"Rajesh Patel", "Surat"},
                {"Anitha Rao", "Bengaluru"},
                {"Mohammed Farooq", "Hyderabad"},
                {"Kavitha Nair", "Kochi"},
        };
        String[] quotes = {
                "We finished our first bottle of " + product + " in two weeks. The aroma while tempering "
                        + "dal takes me back to my grandmother's kitchen in the village.",
                "I stopped buying packet oil after trying " + product + ". You can smell the difference "
                        + "the moment the pan heats up.",
                "It arrived in a glass bottle, thick and fragrant. " + product + " makes even plain rice "
                        + "with pickle feel like a proper meal.",
        };
        int idx = Math.floorMod(product.hashCode(), voices.length);
        return json(Map.of(
                "quote", quotes[idx % quotes.length],
                "author", voices[idx][0],
                "location", voices[idx][1])).toString();
    }

    private JsonNode parse(String contextJson) {
        try {
            return contextJson == null || contextJson.isBlank() ? mapper.createObjectNode()
                    : mapper.readTree(contextJson);
        } catch (Exception e) {
            return mapper.createObjectNode();
        }
    }

    private static String text(JsonNode ctx, String key, String fallback) {
        String v = ctx.path(key).asText("").trim();
        return v.isEmpty() ? fallback : v;
    }

    private static String capitalize(String s) {
        return s.isEmpty() ? s : Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    private ObjectNode json(Map<String, String> fields) {
        ObjectNode node = mapper.createObjectNode();
        new TreeMap<>(fields).forEach(node::put);
        return node;
    }

    private ArrayNode jsonLines(List<String> lines) {
        ArrayNode node = mapper.createArrayNode();
        lines.forEach(node::add);
        return node;
    }
}
