package com.feldnstein.platform.marketing;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.feldnstein.platform.commerce.shared.DomainException;
import org.junit.jupiter.api.Test;

class OllamaGatewayTest {

    @Test
    void unreachableOllamaYieldsActionableError() {
        OllamaGateway gateway = new OllamaGateway("http://127.0.0.1:1", "llama3.2:3b");
        DomainException e = assertThrows(DomainException.class,
                () -> gateway.generate("hero-copy", "{}"));
        assertTrue(e.getMessage().contains("Ollama unreachable"), e.getMessage());
        assertTrue(e.getMessage().contains("AI_PROVIDER=demo"), e.getMessage());
    }

    @Test
    void malformedBaseUrlYieldsActionableError() {
        OllamaGateway gateway = new OllamaGateway("http://bad host with spaces", "llama3.2:3b");
        DomainException e = assertThrows(DomainException.class,
                () -> gateway.generate("hero-copy", "{}"));
        assertTrue(e.getMessage().contains("Ollama unreachable"), e.getMessage());
    }
}
