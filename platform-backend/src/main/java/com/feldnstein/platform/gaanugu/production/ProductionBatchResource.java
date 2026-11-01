package com.feldnstein.platform.gaanugu.production;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;

@ResourceProperties(path = "g/production-batches", rolesAllowed = {"ADMIN", "OPERATOR"})
public interface ProductionBatchResource extends PanacheRepositoryResource<ProductionBatchRepository, ProductionBatch, Long> {
}
