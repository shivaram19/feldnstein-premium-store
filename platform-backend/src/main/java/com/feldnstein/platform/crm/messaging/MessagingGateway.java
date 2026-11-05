package com.feldnstein.platform.crm.messaging;

import java.util.List;

/**
 * Messaging gateway port — the anti-corruption layer between the CRM service
 * and a chat provider (Meta WhatsApp Cloud API + Instagram Messaging, or the
 * built-in demo gateway). The platform stores every interaction regardless of
 * provider; the gateway is only a transport. {@code to} is the channel address
 * (whatsapp phone / instagram id) already resolved by the caller, who also
 * enforces the 24-hour session window: a closed session arrives with
 * {@code sessionOpen=false} and a {@code templateName} (WhatsApp template
 * messages are the only Meta-supported way to re-open a conversation).
 */
public interface MessagingGateway {

    enum Channel { WHATSAPP, INSTAGRAM }

    /**
     * Send a message on the channel; returns the provider's message reference
     * (e.g. {@code wamid.…} from Meta, {@code demo-…} from the demo gateway).
     */
    String send(Channel channel, String to, String text, boolean sessionOpen,
                String templateName, List<String> templateParams);
}
