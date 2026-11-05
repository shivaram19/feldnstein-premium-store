package com.feldnstein.platform.crm;

import com.feldnstein.platform.commerce.order.CustomerOrder;
import com.feldnstein.platform.commerce.shared.DomainException;
import com.feldnstein.platform.commerce.shared.EmailAddress;
import com.feldnstein.platform.crm.messaging.MessagingGateway;
import com.feldnstein.platform.crm.messaging.MessagingService;
import com.feldnstein.platform.loyalty.LoyaltyAccount;
import com.feldnstein.platform.loyalty.LoyaltyTransaction;
import com.feldnstein.platform.marketing.Subscriber;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Customer-360 read model (ADR-0018) — aggregates the platform's existing
 * tables by email into a single customer view: orders, spend, loyalty points
 * and ledger, newsletter subscription. Not a separate contact database; query
 * side only, no behaviour.
 *
 * <p>Extended by ADR-0019 into the single-platform CRM: a contact directory
 * ({@link CrmContact}), an interaction log ({@link CrmInteraction}) and
 * follow-up tasks ({@link CrmTask}), with WhatsApp/Instagram sending behind
 * the {@link MessagingGateway} port. The merged list still unions in
 * order-derived customers and subscribers, so one email always renders as
 * exactly one row.
 */
@ApplicationScoped
public class CrmService {

    static final Duration SESSION_WINDOW = Duration.ofHours(24);

    @Inject MessagingService messaging;

    public List<Map<String, Object>> customers(String q) {
        String needle = q == null || q.isBlank() ? null : q.trim().toLowerCase();
        Map<String, List<CustomerOrder>> byEmail = CustomerOrder.<CustomerOrder>streamAll()
                .collect(Collectors.groupingBy(
                        o -> o.email().toLowerCase(), LinkedHashMap::new, Collectors.toList()));
        List<Map<String, Object>> rows = new ArrayList<>();
        byEmail.forEach((email, orders) -> rows.add(row(email, orders)));
        return rows.stream()
                .filter(r -> needle == null
                        || r.get("email").toString().contains(needle)
                        || r.get("name").toString().toLowerCase().contains(needle))
                .sorted(Comparator.comparing((Map<String, Object> r) -> r.get("lastOrderAt").toString()).reversed())
                .toList();
    }

    /** Full single-customer view, or null when nothing is known about the email. */
    public Map<String, Object> customer(String email) {
        String key = email.trim().toLowerCase();
        List<CustomerOrder> orders = CustomerOrder.<CustomerOrder>streamAll()
                .filter(o -> o.email().equalsIgnoreCase(key))
                .sorted(Comparator.comparing(CustomerOrder::createdAt).reversed())
                .toList();
        LoyaltyAccount account = LoyaltyAccount.findByEmail(key);
        Subscriber subscriber = Subscriber.findByEmail(key);
        if (orders.isEmpty() && account == null && subscriber == null) return null;

        Map<String, Object> profile = new LinkedHashMap<String, Object>();
        profile.put("email", key);
        profile.put("name", orders.isEmpty()
                ? (subscriber == null || subscriber.name() == null ? "" : subscriber.name())
                : orders.get(0).customerName());
        profile.put("ordersCount", orders.size());
        profile.put("totalSpendPaise", orders.stream().mapToLong(o -> paise(o.grandTotal().amount())).sum());
        profile.put("points", account == null ? 0 : account.pointsBalance());

        Map<String, Object> view = new LinkedHashMap<String, Object>();
        view.put("profile", profile);
        view.put("orders", orders.stream().map(o -> {
            Map<String, Object> brief = new LinkedHashMap<String, Object>();
            brief.put("orderCode", o.orderCode());
            brief.put("status", o.status().name());
            brief.put("grandTotal", o.grandTotal().amount());
            brief.put("grandTotalPaise", paise(o.grandTotal().amount()));
            brief.put("pointsRedeemed", o.pointsRedeemed());
            brief.put("createdAt", o.createdAt().toString());
            return brief;
        }).toList());
        view.put("loyaltyTransactions", account == null ? List.of()
                : LoyaltyTransaction.<LoyaltyTransaction>streamAll()
                        .filter(t -> t.account().id.equals(account.id))
                        .sorted(Comparator.comparing(LoyaltyTransaction::createdAt).reversed())
                        .map(t -> {
                            Map<String, Object> tx = new LinkedHashMap<String, Object>();
                            tx.put("id", t.id);
                            tx.put("type", t.type().name());
                            tx.put("points", t.points());
                            tx.put("balanceAfter", t.balanceAfter());
                            tx.put("reason", t.reason() == null ? "" : t.reason());
                            tx.put("orderId", t.orderId() == null ? "" : t.orderId());
                            tx.put("createdAt", t.createdAt().toString());
                            return tx;
                        }).toList());
        Map<String, Object> subscription = new LinkedHashMap<String, Object>();
        subscription.put("subscribed", subscriber != null);
        subscription.put("source", subscriber == null ? "" : subscriber.source());
        subscription.put("createdAt", subscriber == null ? "" : subscriber.createdAt().toString());
        view.put("subscription", subscription);
        return view;
    }

    /* ---- ADR-0019: contacts, interactions, tasks, social messaging ---- */

    /** Upsert outcome so the resource can answer 201 (created) or 200 (merged). */
    public record UpsertResult(CrmContact contact, boolean created) {}

    /** Create or update a contact by email; only provided fields are written. */
    @Transactional
    public UpsertResult upsert(String email, String name, String phone, String whatsappPhone,
                               Boolean whatsappOptIn, String whatsappOptInSource, String instagramHandle,
                               String source, String tags, String status) {
        if (email == null || email.isBlank()) throw new DomainException("email is required");
        String key = new EmailAddress(email.trim()).value().toLowerCase();
        CrmContact.Status target = status == null || status.isBlank() ? null : CrmContact.parseStatus(status);
        CrmContact contact = CrmContact.findByEmail(key);
        boolean created = contact == null;
        if (created) {
            contact = CrmContact.create(key, name);
            contact.persist();
        } else if (name != null) {
            contact.setName(name);
        }
        if (phone != null) contact.setPhone(phone);
        if (whatsappPhone != null) contact.setWhatsappPhone(whatsappPhone);
        if (whatsappOptIn != null) contact.setWhatsappOptIn(whatsappOptIn);
        if (whatsappOptInSource != null) contact.setWhatsappOptInSource(whatsappOptInSource);
        if (instagramHandle != null) contact.setInstagramHandle(instagramHandle);
        if (source != null) contact.setSource(source);
        if (tags != null) contact.setTags(tags);
        if (target != null) contact.setStatus(target);
        contact.touch();
        return new UpsertResult(contact, created);
    }

    /** The contact for the email, creating a bare LEAD (name = local part) if unknown. */
    @Transactional
    public CrmContact getOrCreateContact(String email) {
        String key = new EmailAddress(email.trim()).value().toLowerCase();
        CrmContact contact = CrmContact.findByEmail(key);
        if (contact == null) {
            contact = CrmContact.create(key, key.substring(0, key.indexOf('@')));
            contact.persist();
        }
        return contact;
    }

    /** Record who said/did what; INBOUND channel handles are adopted onto the contact. */
    @Transactional
    public CrmInteraction recordInteraction(String email, String channelName, String directionName,
                                            String body, String author, String handle) {
        CrmInteraction.Channel channel;
        try {
            channel = CrmInteraction.Channel.valueOf(
                    channelName == null ? "" : channelName.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new DomainException("unknown channel '" + channelName
                    + "' — supported: NOTE, CALL, EMAIL, VISIT, WHATSAPP, INSTAGRAM");
        }
        CrmInteraction.Direction direction;
        try {
            direction = directionName == null || directionName.isBlank()
                    ? CrmInteraction.Direction.OUTBOUND
                    : CrmInteraction.Direction.valueOf(directionName.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new DomainException("unknown direction '" + directionName + "' — supported: INBOUND, OUTBOUND");
        }
        if (body == null || body.isBlank()) throw new DomainException("interaction body is required");
        CrmContact contact = getOrCreateContact(email);
        if (direction == CrmInteraction.Direction.INBOUND && handle != null && !handle.isBlank()) {
            if (channel == CrmInteraction.Channel.WHATSAPP) contact.setWhatsappPhone(handle.trim());
            if (channel == CrmInteraction.Channel.INSTAGRAM) contact.setInstagramHandle(handle.trim());
        }
        CrmInteraction interaction = CrmInteraction.record(
                contact, channel, direction, body.trim(), author == null ? "" : author);
        interaction.persist();
        return interaction;
    }

    /**
     * Merged contacts list (ADR-0019): crm_contact rows union order-derived
     * customers and subscribers, one row per email. Status comes from the
     * contact row, else ACTIVE when the email has orders, else LEAD.
     */
    @Transactional
    public List<Map<String, Object>> contactsList(String q, String status) {
        String needle = q == null || q.isBlank() ? null : q.trim().toLowerCase();
        Map<String, CrmContact> contacts = CrmContact.<CrmContact>streamAll()
                .collect(Collectors.toMap(c -> c.email(), c -> c, (a, b) -> a, LinkedHashMap::new));
        Map<String, List<CustomerOrder>> ordersByEmail = CustomerOrder.<CustomerOrder>streamAll()
                .collect(Collectors.groupingBy(
                        o -> o.email().toLowerCase(), LinkedHashMap::new, Collectors.toList()));
        Map<String, Subscriber> subscribers = Subscriber.<Subscriber>streamAll()
                .collect(Collectors.toMap(s -> s.email().toLowerCase(), s -> s, (a, b) -> a, LinkedHashMap::new));

        Set<String> emails = new LinkedHashSet<String>();
        emails.addAll(contacts.keySet());
        emails.addAll(ordersByEmail.keySet());
        emails.addAll(subscribers.keySet());

        Instant now = Instant.now();
        List<Map<String, Object>> rows = new ArrayList<>();
        for (String email : emails) {
            CrmContact contact = contacts.get(email);
            List<CustomerOrder> orders = ordersByEmail.getOrDefault(email, List.of());
            Subscriber subscriber = subscribers.get(email);
            CustomerOrder latest = orders.stream()
                    .max(Comparator.comparing(CustomerOrder::createdAt)).orElse(null);

            String name = contact != null && contact.name() != null ? contact.name()
                    : latest != null ? latest.customerName()
                    : subscriber != null && subscriber.name() != null ? subscriber.name() : "";
            String effectiveStatus = contact != null ? contact.status().name()
                    : !orders.isEmpty() ? CrmContact.Status.ACTIVE.name()
                    : CrmContact.Status.LEAD.name();

            Map<String, Object> rowMap = new LinkedHashMap<String, Object>();
            rowMap.put("email", email);
            rowMap.put("name", name);
            rowMap.put("status", effectiveStatus);
            rowMap.put("tags", contact == null || contact.tags() == null ? "" : contact.tags());
            rowMap.put("whatsappPhone", contact == null || contact.whatsappPhone() == null
                    ? "" : contact.whatsappPhone());
            rowMap.put("whatsappOptIn", contact != null && contact.whatsappOptIn());
            rowMap.put("instagramHandle", contact == null || contact.instagramHandle() == null
                    ? "" : contact.instagramHandle());
            rowMap.put("source", contact != null && contact.source() != null ? contact.source()
                    : subscriber != null ? subscriber.source() : "");
            rowMap.put("ordersCount", orders.size());
            rowMap.put("totalSpendPaise", orders.stream().mapToLong(o -> paise(o.grandTotal().amount())).sum());
            LoyaltyAccount account = LoyaltyAccount.findByEmail(email);
            rowMap.put("points", account == null ? 0 : account.pointsBalance());
            rowMap.put("subscribed", subscriber != null);
            rowMap.put("lastOrderAt", latest == null ? "" : latest.createdAt().toString());
            if (contact != null) {
                rowMap.put("openTasks", (int) CrmTask.count("contact = ?1 and done = false", contact));
                rowMap.put("overdueTasks",
                        (int) CrmTask.count("contact = ?1 and done = false and dueAt < ?2", contact, now));
            } else {
                rowMap.put("openTasks", 0);
                rowMap.put("overdueTasks", 0);
            }
            rows.add(rowMap);
        }

        return rows.stream()
                .filter(r -> needle == null
                        || r.get("email").toString().contains(needle)
                        || r.get("name").toString().toLowerCase().contains(needle))
                .filter(r -> status == null || status.isBlank()
                        || r.get("status").toString().equalsIgnoreCase(status.trim()))
                .sorted(Comparator.comparing((Map<String, Object> r) ->
                                !r.get("lastOrderAt").toString().isEmpty(), Comparator.reverseOrder())
                        .thenComparing(Comparator.comparing(
                                (Map<String, Object> r) -> r.get("lastOrderAt").toString()).reversed())
                        .thenComparing(r -> r.get("email").toString()))
                .toList();
    }

    /**
     * Contact detail: profile + the same stats as the merged list + the
     * interaction log (newest first) + tasks + subscription + recent orders.
     * Null when nothing is known about the email.
     */
    @Transactional
    public Map<String, Object> contactDetail(String email) {
        String key = email.trim().toLowerCase();
        CrmContact contact = CrmContact.findByEmail(key);
        List<CustomerOrder> orders = CustomerOrder.<CustomerOrder>streamAll()
                .filter(o -> o.email().equalsIgnoreCase(key))
                .sorted(Comparator.comparing(CustomerOrder::createdAt).reversed())
                .toList();
        LoyaltyAccount account = LoyaltyAccount.findByEmail(key);
        Subscriber subscriber = Subscriber.findByEmail(key);
        if (contact == null && orders.isEmpty() && account == null && subscriber == null) return null;

        Map<String, Object> profile = new LinkedHashMap<String, Object>();
        profile.put("email", key);
        profile.put("name", contact != null && contact.name() != null ? contact.name()
                : !orders.isEmpty() ? orders.get(0).customerName()
                : subscriber == null || subscriber.name() == null ? "" : subscriber.name());
        profile.put("status", contact != null ? contact.status().name()
                : !orders.isEmpty() ? CrmContact.Status.ACTIVE.name() : CrmContact.Status.LEAD.name());
        profile.put("tags", contact == null || contact.tags() == null ? "" : contact.tags());
        profile.put("whatsappPhone", contact == null || contact.whatsappPhone() == null
                ? "" : contact.whatsappPhone());
        profile.put("whatsappOptIn", contact != null && contact.whatsappOptIn());
        profile.put("instagramHandle", contact == null || contact.instagramHandle() == null
                ? "" : contact.instagramHandle());
        profile.put("source", contact != null && contact.source() != null ? contact.source()
                : subscriber == null ? "" : subscriber.source());
        profile.put("ordersCount", orders.size());
        profile.put("totalSpendPaise", orders.stream().mapToLong(o -> paise(o.grandTotal().amount())).sum());
        profile.put("points", account == null ? 0 : account.pointsBalance());

        Map<String, Object> view = new LinkedHashMap<String, Object>();
        view.put("profile", profile);
        view.put("orders", orders.stream().map(o -> {
            Map<String, Object> brief = new LinkedHashMap<String, Object>();
            brief.put("orderCode", o.orderCode());
            brief.put("status", o.status().name());
            brief.put("grandTotalPaise", paise(o.grandTotal().amount()));
            brief.put("createdAt", o.createdAt().toString());
            return brief;
        }).toList());
        view.put("interactions", contact == null ? List.of()
                : CrmInteraction.<CrmInteraction>streamAll()
                        .filter(i -> i.contact().id.equals(contact.id))
                        .sorted(Comparator.comparing(CrmInteraction::createdAt).reversed()
                                .thenComparing(Comparator.comparing((CrmInteraction i) -> i.id).reversed()))
                        .map(CrmService::interactionRow)
                        .toList());
        view.put("tasks", contact == null ? List.of()
                : CrmTask.<CrmTask>streamAll()
                        .filter(t -> t.contact().id.equals(contact.id))
                        .sorted(Comparator.comparing(CrmTask::createdAt).reversed()
                                .thenComparing(Comparator.comparing((CrmTask t) -> t.id).reversed()))
                        .map(CrmService::taskRow)
                        .toList());
        Map<String, Object> subscription = new LinkedHashMap<String, Object>();
        subscription.put("subscribed", subscriber != null);
        subscription.put("source", subscriber == null ? "" : subscriber.source());
        subscription.put("createdAt", subscriber == null ? "" : subscriber.createdAt().toString());
        view.put("subscription", subscription);
        return view;
    }

    /** The 24-hour session window is open when an INBOUND interaction exists on the channel. */
    @Transactional
    public boolean sessionOpen(String email, String channelName) {
        MessagingGateway.Channel channel = parseMessagingChannel(channelName);
        CrmContact contact = CrmContact.findByEmail(email);
        if (contact == null) return false;
        return CrmInteraction.count(
                "contact = ?1 and channel = ?2 and direction = ?3 and createdAt >= ?4",
                contact, CrmInteraction.Channel.valueOf(channel.name()), CrmInteraction.Direction.INBOUND,
                Instant.now().minus(SESSION_WINDOW)) > 0;
    }

    /** Tasks, newest first; {@code openOnly} keeps only unfinished ones. */
    @Transactional
    public List<Map<String, Object>> openTasksList(boolean openOnly) {
        return CrmTask.<CrmTask>streamAll()
                .filter(t -> !openOnly || !t.done())
                .sorted(Comparator.comparing(CrmTask::createdAt).reversed()
                        .thenComparing(Comparator.comparing((CrmTask t) -> t.id).reversed()))
                .map(CrmService::taskRow)
                .toList();
    }

    /** Creates a follow-up task; the contact is created when unknown. */
    @Transactional
    public CrmTask addTask(String email, String subject, Instant dueAt, String createdBy) {
        if (subject == null || subject.isBlank()) throw new DomainException("task subject is required");
        CrmTask task = CrmTask.create(getOrCreateContact(email), subject.trim(), dueAt, createdBy);
        task.persist();
        return task;
    }

    /** Marks a task done; unknown ids are a client error. */
    @Transactional
    public CrmTask completeTask(Long id) {
        CrmTask task = CrmTask.findById(id);
        if (task == null) throw new DomainException("no task with id " + id);
        task.complete(Instant.now());
        return task;
    }

    /**
     * Sends a WhatsApp/Instagram message through the selected gateway and
     * records the OUTBOUND interaction. WhatsApp requires the contact's
     * opt-in (Meta Business Messaging Policy); free-form text is only allowed
     * inside the 24-hour session window, otherwise a template name is
     * required. Returns the send outcome for the API response.
     */
    @Transactional
    public Map<String, Object> sendMessage(String channelName, String email, String text,
                                           String templateName, List<String> templateParams, String author) {
        MessagingGateway.Channel channel = parseMessagingChannel(channelName);
        if (text == null || text.isBlank()) throw new DomainException("message text is required");
        CrmContact contact = getOrCreateContact(email);
        if (channel == MessagingGateway.Channel.WHATSAPP && !contact.whatsappOptIn()) {
            throw new DomainException("whatsapp opt-in is required before messaging "
                    + contact.email() + " (Meta Business Messaging Policy)");
        }
        String to = channel == MessagingGateway.Channel.WHATSAPP
                ? contact.whatsappPhone() : contact.instagramHandle();
        if (to == null || to.isBlank()) {
            throw new DomainException("contact has no " + channel.name().toLowerCase()
                    + " handle — record an inbound interaction first");
        }
        boolean sessionOpen = sessionOpen(email, channelName);
        if (!sessionOpen && (templateName == null || templateName.isBlank())) {
            throw new DomainException("session closed — templateName required");
        }
        String providerRef = messaging.send(channel, to, text.trim(), sessionOpen, templateName, templateParams);
        String body = templateName == null || templateName.isBlank()
                ? text.trim() : "[" + templateName.trim() + "] " + text.trim();
        CrmInteraction interaction = CrmInteraction.record(
                contact, CrmInteraction.Channel.valueOf(channel.name()),
                CrmInteraction.Direction.OUTBOUND, body, author == null ? "" : author);
        interaction.persist();
        Map<String, Object> result = new LinkedHashMap<String, Object>();
        result.put("provider", messaging.provider());
        result.put("sessionOpen", sessionOpen);
        result.put("interactionId", interaction.id);
        result.put("providerRef", providerRef);
        return result;
    }

    private static MessagingGateway.Channel parseMessagingChannel(String channelName) {
        try {
            return MessagingGateway.Channel.valueOf(channelName == null ? "" : channelName.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new DomainException("unknown channel '" + channelName + "' — supported: WHATSAPP, INSTAGRAM");
        }
    }

    private static Map<String, Object> interactionRow(CrmInteraction i) {
        Map<String, Object> row = new LinkedHashMap<String, Object>();
        row.put("id", i.id);
        row.put("channel", i.channel().name());
        row.put("direction", i.direction().name());
        row.put("body", i.body());
        row.put("author", i.author());
        row.put("createdAt", i.createdAt().toString());
        return row;
    }

    private static Map<String, Object> taskRow(CrmTask t) {
        Map<String, Object> row = new LinkedHashMap<String, Object>();
        row.put("id", t.id);
        row.put("contactEmail", t.contact().email());
        row.put("subject", t.subject());
        row.put("dueAt", t.dueAt() == null ? "" : t.dueAt().toString());
        row.put("done", t.done());
        row.put("overdue", t.overdue(Instant.now()));
        row.put("createdBy", t.createdBy() == null ? "" : t.createdBy());
        return row;
    }

    private static Map<String, Object> row(String email, List<CustomerOrder> orders) {
        CustomerOrder latest = orders.stream()
                .max(Comparator.comparing(CustomerOrder::createdAt)).orElseThrow();
        LoyaltyAccount account = LoyaltyAccount.findByEmail(email);
        Subscriber subscriber = Subscriber.findByEmail(email);
        Map<String, Object> row = new LinkedHashMap<String, Object>();
        row.put("email", email);
        row.put("name", latest.customerName());
        row.put("ordersCount", orders.size());
        row.put("totalSpendPaise", orders.stream().mapToLong(o -> paise(o.grandTotal().amount())).sum());
        row.put("points", account == null ? 0 : account.pointsBalance());
        row.put("subscribed", subscriber != null);
        row.put("lastOrderAt", latest.createdAt().toString());
        return row;
    }

    private static long paise(java.math.BigDecimal rupees) {
        return rupees.movePointRight(2).longValueExact();
    }
}
