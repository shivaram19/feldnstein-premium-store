package com.feldnstein.platform.gaanugu.production;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;

@ResourceProperties(path = "g/bottling-runs", rolesAllowed = {"ADMIN", "OPERATOR"})
public interface BottlingRunResource extends PanacheRepositoryResource<BottlingRunRepository, BottlingRun, Long> {
}
