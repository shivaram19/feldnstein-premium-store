package com.feldnstein.platform.gaanugu;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;
import com.feldnstein.platform.gaanugu.ProductionBatchRepository;

@ResourceProperties(path = "g/production-batches", rolesAllowed = {"ADMIN", "OPERATOR"})
public interface ProductionBatchResource extends PanacheRepositoryResource<ProductionBatchRepository, ProductionBatch, Long> {
}
