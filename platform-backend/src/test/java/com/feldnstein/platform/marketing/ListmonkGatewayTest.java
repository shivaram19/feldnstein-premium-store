package com.feldnstein.platform.marketing;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.List;
import org.junit.jupiter.api.Test;

class ListmonkGatewayTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void payloadCarriesSubscriberFieldsAndLists() {
        ObjectNode payload = ListmonkGateway.buildPayload(mapper, "asha@example.com", "Asha", List.of("2", "5"));
        assertEquals("asha@example.com", payload.get("email").asText());
        assertEquals("Asha", payload.get("name").asText());
        assertEquals("enabled", payload.get("status").asText());
        assertEquals(2, payload.get("lists").size());
    }

    @Test
    void payloadOmitsNameAndListsWhenAbsent() {
        ObjectNode payload = ListmonkGateway.buildPayload(mapper, "asha@example.com", null, List.of());
        assertFalse(payload.has("name"));
        assertFalse(payload.has("lists"));
    }
}
