package com.feldnstein.platform.gaanugu;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;
import com.feldnstein.platform.gaanugu.StockMovementRepository;

@ResourceProperties(path = "g/stock-movements", rolesAllowed = {"ADMIN", "OPERATOR"})
public interface StockMovementResource extends PanacheRepositoryResource<StockMovementRepository, StockMovement, Long> {
}
