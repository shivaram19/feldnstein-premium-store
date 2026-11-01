package com.feldnstein.platform.commerce;

import io.quarkus.arc.Unremovable;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@Unremovable
@ApplicationScoped
public class LoyaltyAccountRepository implements PanacheRepository<LoyaltyAccount> {
}
