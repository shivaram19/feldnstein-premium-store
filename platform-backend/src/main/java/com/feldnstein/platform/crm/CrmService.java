package com.feldnstein.platform.crm;

import com.feldnstein.platform.commerce.order.CustomerOrder;
import com.feldnstein.platform.loyalty.LoyaltyAccount;
import com.feldnstein.platform.loyalty.LoyaltyTransaction;
import com.feldnstein.platform.marketing.Subscriber;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Customer-360 read model (ADR-0018) — aggregates the platform's existing
 * tables by email into a single customer view: orders, spend, loyalty points
 * and ledger, newsletter subscription. Not a separate contact database; query
 * side only, no behaviour.
 */
@ApplicationScoped
public class CrmService {

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
