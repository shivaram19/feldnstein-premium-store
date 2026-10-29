package com.feldnstein.platform.gaanugu;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;
import com.feldnstein.platform.gaanugu.StockLevelRepository;

@ResourceProperties(path = "g/stock-levels", rolesAllowed = {"ADMIN", "OPERATOR"})
public interface StockLevelResource extends PanacheRepositoryResource<StockLevelRepository, StockLevel, Long> {
}
