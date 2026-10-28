package com.feldnstein.platform.gaanugu;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;
import com.feldnstein.platform.gaanugu.SeedProcurementRepository;

@ResourceProperties(path = "g/seed-procurements", rolesAllowed = {"ADMIN", "OPERATOR"})
public interface SeedProcurementResource extends PanacheRepositoryResource<SeedProcurementRepository, SeedProcurement, Long> {
}
