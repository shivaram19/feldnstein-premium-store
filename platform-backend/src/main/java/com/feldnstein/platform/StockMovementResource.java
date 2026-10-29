package com.feldnstein.platform;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;

@ResourceProperties(path = "stock-movements", rolesAllowed = {"ADMIN", "OPERATOR"})
public interface StockMovementResource extends PanacheRepositoryResource<StockMovementRepository, StockMovement, Long> {
}
