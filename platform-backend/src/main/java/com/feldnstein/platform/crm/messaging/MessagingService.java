package com.feldnstein.platform.crm.messaging;

import com.feldnstein.platform.commerce.shared.DomainException;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Instance;
import jakarta.inject.Inject;
import java.util.List;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

/**
 * Messaging application service — selects the gateway adapter by configuration
 * ({@code messaging.provider=meta|demo}) and delegates sends to it.
 */
@ApplicationScoped
public class MessagingService {

    private static final Logger LOG = Logger.getLogger(MessagingService.class);

    @ConfigProperty(name = "messaging.provider", defaultValue = "demo")
    String provider;

    @Inject Instance<MessagingGateway> gateways;
    @Inject MetaMessagingGateway meta;

    private MessagingGateway gateway() {
        if ("meta".equalsIgnoreCase(provider)) {
            if (meta.configured()) return meta;
            LOG.warn("messaging.provider=meta but messaging.meta.* config is incomplete"
                    + " — falling back to the demo gateway");
        }
        return gateways.stream()
                .filter(g -> g instanceof DemoMessagingGateway)
                .findFirst()
                .orElseThrow(() -> new DomainException("no messaging gateway adapter available"));
    }

    /** Selected provider name, surfaced in API responses ("demo" or "meta"). */
    public String provider() {
        return gateway() instanceof MetaMessagingGateway ? "meta" : "demo";
    }

    public String send(MessagingGateway.Channel channel, String to, String text, boolean sessionOpen,
                       String templateName, List<String> templateParams) {
        return gateway().send(channel, to, text, sessionOpen, templateName, templateParams);
    }
}
