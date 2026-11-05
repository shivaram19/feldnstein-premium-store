package com.feldnstein.platform.crm.messaging;

import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;

/**
 * Demo gateway — stands in for a real chat provider: no network, returns a
 * simulated provider reference so the full social-CRM loop is demoable
 * offline. Selected when {@code messaging.provider=demo} (the default), and
 * as the fallback when {@code messaging.provider=meta} is configured
 * incompletely.
 */
@ApplicationScoped
public class DemoMessagingGateway implements MessagingGateway {

    @Override
    public String send(Channel channel, String to, String text, boolean sessionOpen,
                       String templateName, List<String> templateParams) {
        return "demo-" + System.currentTimeMillis();
    }
}
