package com.feldnstein.platform;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;

@ResourceProperties(path = "loyalty-transactions")
public interface LoyaltyTransactionResource
        extends PanacheRepositoryResource<LoyaltyTransactionRepository, LoyaltyTransaction, Long> {
}
