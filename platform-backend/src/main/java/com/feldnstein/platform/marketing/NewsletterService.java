package com.feldnstein.platform.marketing;

import com.feldnstein.platform.commerce.shared.DomainException;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Instance;
import jakarta.inject.Inject;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

/**
 * Newsletter application service — selects the gateway adapter by
 * configuration ({@code newsletter.provider=listmonk|demo}) and exposes the
 * subscriber list captured so far.
 */
@ApplicationScoped
public class NewsletterService {

    private static final Logger LOG = Logger.getLogger(NewsletterService.class);

    @ConfigProperty(name = "newsletter.provider", defaultValue = "demo")
    String provider;

    @Inject Instance<NewsletterGateway> gateways;
    @Inject ListmonkGateway listmonk;

    private NewsletterGateway gateway() {
        if ("listmonk".equalsIgnoreCase(provider)) {
            if (listmonk.configured()) return listmonk;
            LOG.warn("newsletter.provider=listmonk but listmonk.api-token is missing — falling back to the demo gateway");
        }
        return gateways.stream()
                .filter(g -> g instanceof DemoNewsletterGateway)
                .findFirst()
                .orElseThrow(() -> new DomainException("no newsletter gateway adapter available"));
    }

    /** Selected provider name, surfaced in API responses ("demo" or "listmonk"). */
    public String provider() {
        return gateway() instanceof ListmonkGateway ? "listmonk" : "demo";
    }

    public void subscribe(String email, String name) {
        gateway().subscribe(email, name);
    }

    /** Local mirror of every subscription captured through this platform. */
    public List<Map<String, Object>> subscriberRows() {
        return Subscriber.<Subscriber>streamAll()
                .sorted(Comparator.comparing(Subscriber::createdAt).reversed())
                .map(s -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", s.id);
                    row.put("email", s.email());
                    row.put("name", s.name() == null ? "" : s.name());
                    row.put("source", s.source());
                    row.put("createdAt", s.createdAt().toString());
                    return row;
                })
                .toList();
    }
}
