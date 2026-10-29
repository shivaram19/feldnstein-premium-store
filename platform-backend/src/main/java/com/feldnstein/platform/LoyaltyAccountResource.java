package com.feldnstein.platform;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;

@ResourceProperties(path = "loyalty-accounts", rolesAllowed = {"ADMIN", "OPERATOR"})
public interface LoyaltyAccountResource extends PanacheRepositoryResource<LoyaltyAccountRepository, LoyaltyAccount, Long> {
}
