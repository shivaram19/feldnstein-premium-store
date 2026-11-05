package com.feldnstein.platform.crm.messaging;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.feldnstein.platform.commerce.shared.DomainException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class MetaMessagingGatewayTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void openSessionBuildsFreeFormWhatsAppPayload() {
        ObjectNode payload = MetaMessagingGateway.buildPayload(mapper,
                MessagingGateway.Channel.WHATSAPP, "919876543210", "hello there", true, null, null);
        assertEquals("whatsapp", payload.get("messaging_product").asText());
        assertEquals("919876543210", payload.get("to").asText());
        assertEquals("text", payload.get("type").asText());
        assertEquals("hello there", payload.get("text").get("body").asText());
    }

    @Test
    void closedSessionBuildsTemplatePayloadWithComponentParameters() {
        ObjectNode payload = MetaMessagingGateway.buildPayload(mapper,
                MessagingGateway.Channel.WHATSAPP, "919876543210", "your batch is ready", false,
                "order_update", List.of("FB-100", "500ml"));
        assertEquals("template", payload.get("type").asText());
        assertEquals("order_update", payload.get("template").get("name").asText());
        assertEquals("en", payload.get("template").get("language").get("code").asText());
        assertEquals("body", payload.get("template").get("components").get(0).get("type").asText());
        assertEquals("FB-100", payload.get("template").get("components").get(0)
                .get("parameters").get(0).get("text").asText());
        assertEquals("500ml", payload.get("template").get("components").get(0)
                .get("parameters").get(1).get("text").asText());
    }

    @Test
    void instagramPayloadTargetsRecipientWithText() {
        ObjectNode payload = MetaMessagingGateway.buildPayload(mapper,
                MessagingGateway.Channel.INSTAGRAM, "1234567890", "reel reply", true, null, null);
        assertEquals("1234567890", payload.get("recipient").get("id").asText());
        assertEquals("reel reply", payload.get("message").get("text").asText());
    }

    @Test
    void non2xxSurfacesMetaErrorMessage() throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v21.0/12345/messages", exchange -> {
            byte[] body = ("{\"error\":{\"message\":\"(#131030) Recipient phone number not in allowed list\","
                    + "\"code\":131030}}").getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(400, body.length);
            try (OutputStream out = exchange.getResponseBody()) {
                out.write(body);
            }
        });
        server.start();
        try {
            MetaMessagingGateway gateway = new MetaMessagingGateway();
            gateway.baseUrl = "http://127.0.0.1:" + server.getAddress().getPort() + "/v21.0";
            gateway.whatsappPhoneNumberId = Optional.of("12345");
            gateway.whatsappToken = Optional.of("test-token");
            gateway.mapper = mapper;

            DomainException e = assertThrows(DomainException.class, () -> gateway.send(
                    MessagingGateway.Channel.WHATSAPP, "919876543210", "hi", true, null, null));
            assertTrue(e.getMessage().contains("Recipient phone number not in allowed list"), e.getMessage());
        } finally {
            server.stop(0);
        }
    }

    @Test
    void successReturnsMetaMessageIdAsProviderRef() throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v21.0/12345/messages", exchange -> {
            byte[] body = ("{\"messaging_product\":\"whatsapp\",\"contacts\":[{\"input\":\"919876543210\"}],"
                    + "\"messages\":[{\"id\":\"wamid.HBgLOTkxOTg3NjU0MzIxMA==\"}]}")
                    .getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, body.length);
            try (OutputStream out = exchange.getResponseBody()) {
                out.write(body);
            }
        });
        server.start();
        try {
            MetaMessagingGateway gateway = new MetaMessagingGateway();
            gateway.baseUrl = "http://127.0.0.1:" + server.getAddress().getPort() + "/v21.0";
            gateway.whatsappPhoneNumberId = Optional.of("12345");
            gateway.whatsappToken = Optional.of("test-token");
            gateway.mapper = mapper;

            String ref = gateway.send(MessagingGateway.Channel.WHATSAPP, "919876543210", "hi", true, null, null);
            assertEquals("wamid.HBgLOTkxOTg3NjU0MzIxMA==", ref);
        } finally {
            server.stop(0);
        }
    }
}
