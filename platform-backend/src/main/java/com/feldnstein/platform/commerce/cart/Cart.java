package com.feldnstein.platform.commerce.cart;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "cart")
public class Cart extends PanacheEntity {

    /** Anonymous session token sent by the storefront as the X-Cart-Token header. */
    @Column(nullable = false, unique = true, length = 64)
    public String token;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt = Instant.now();

    @Column(name = "expires_at", nullable = false)
    public Instant expiresAt;

    @OneToMany(mappedBy = "cart", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    public List<CartItem> items = new ArrayList<>();

    public static Cart findByToken(String token) {
        return find("token", token).firstResult();
    }
}
