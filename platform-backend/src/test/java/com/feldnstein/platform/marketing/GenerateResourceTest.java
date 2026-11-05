package com.feldnstein.platform.marketing;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.Response;
import java.util.Map;
import org.junit.jupiter.api.Test;

@QuarkusTest
class GenerateResourceTest {

    @Inject MarketingResource marketing;

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    @TestSecurity(user = "admin", roles = "ADMIN")
    void generateHeroCopyAsAdmin() throws Exception {
        Response r = marketing.generate(
                new MarketingResource.GenerateRequest("hero-copy", Map.of("productName", "Test Oil")));
        assertEquals(200, r.getStatus());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) r.getEntity();
        assertEquals("demo", body.get("provider"));
        String text = (String) body.get("text");
        assertFalse(text.isBlank());
        JsonNode json = mapper.readTree(text);
        assertFalse(json.get("headline").asText().isBlank());
    }
}
