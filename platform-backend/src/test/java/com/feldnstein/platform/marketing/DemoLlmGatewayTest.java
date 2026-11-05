package com.feldnstein.platform.marketing;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class DemoLlmGatewayTest {

    private final DemoLlmGateway gateway = new DemoLlmGateway();
    private final ObjectMapper mapper = new ObjectMapper();

    private String ctx() throws Exception {
        return mapper.writeValueAsString(Map.of(
                "productName", "Mothadaka Groundnut Oil",
                "oilType", "groundnut",
                "sizeMl", 500,
                "notes", "warm and nutty"));
    }

    @Test
    void productDescriptionMentionsProductName() throws Exception {
        String text = gateway.generate("product-description", ctx());
        assertFalse(text.isBlank());
        assertTrue(text.contains("Mothadaka Groundnut Oil"), "product name must appear in the copy");
        assertTrue(text.contains("gaanugu"), "process story must be present");
        assertTrue(text.split("\n").length >= 2, "two short paragraphs expected");
    }

    @Test
    void heroCopyIsParseableJsonWithinLimits() throws Exception {
        JsonNode json = mapper.readTree(gateway.generate("hero-copy", ctx()));
        assertTrue(json.has("headline") && json.has("subcopy"));
        assertTrue(json.get("headline").asText().split("\\s+").length <= 8, "headline must be at most 8 words");
        assertFalse(json.get("headline").asText().contains("!"), "no exclamation marks");
        assertFalse(json.get("subcopy").asText().contains("!"), "no exclamation marks");
    }

    @Test
    void tickerLinesAreParseableShortClaims() throws Exception {
        JsonNode json = mapper.readTree(gateway.generate("ticker-lines", ctx()));
        assertTrue(json.isArray(), "ticker-lines must be a JSON array");
        assertTrue(json.size() >= 3 && json.size() <= 5, "3–5 lines expected");
        for (JsonNode line : json) {
            assertTrue(line.asText().split("\\s+").length <= 6, "each line must be at most 6 words: " + line);
        }
    }

    @Test
    void testimonialIsParseableJson() throws Exception {
        JsonNode json = mapper.readTree(gateway.generate("testimonial", ctx()));
        assertTrue(json.has("quote") && json.has("author") && json.has("location"));
        assertFalse(json.get("quote").asText().isBlank());
        assertFalse(json.get("author").asText().isBlank());
        assertFalse(json.get("location").asText().isBlank());
    }

    @Test
    void emailCampaignHasSubjectAndBody() throws Exception {
        String text = gateway.generate("email-campaign", ctx());
        assertFalse(text.isBlank());
        assertTrue(text.startsWith("Subject:"), "subject line first");
        assertTrue(text.contains("Mothadaka Groundnut Oil"));
    }

    @Test
    void copyAvoidsHypeWords() throws Exception {
        List<String> banned = List.of("revolutionary", "game-changer", "magic", "miracle");
        for (String task : List.of("product-description", "hero-copy", "ticker-lines", "testimonial")) {
            String text = gateway.generate(task, ctx()).toLowerCase();
            for (String word : banned)
                assertFalse(text.contains(word), task + " must not contain hype word '" + word + "'");
        }
    }
}
