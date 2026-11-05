package com.feldnstein.platform.marketing;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.feldnstein.platform.commerce.shared.DomainException;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.Map;
import org.junit.jupiter.api.Test;

@QuarkusTest
class MarketingServiceTest {

    @Inject MarketingService marketing;

    @Test
    void unknownTaskIsRejected() {
        DomainException e = assertThrows(DomainException.class,
                () -> marketing.generate("press-release", Map.of()));
        assertTrue(e.getMessage().contains("press-release"), e.getMessage());
    }

    @Test
    void demoProviderIsSelectedByDefault() {
        assertEquals("demo", marketing.provider());
        String text = marketing.generate("hero-copy", Map.of("productName", "Test Oil"));
        assertFalse(text.isBlank());
    }
}
