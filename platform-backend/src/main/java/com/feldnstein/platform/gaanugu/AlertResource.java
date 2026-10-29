package com.feldnstein.platform.gaanugu;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;

@ResourceProperties(path = "g/alerts", rolesAllowed = {"ADMIN", "OPERATOR"})
public interface AlertResource extends PanacheRepositoryResource<AlertRepository, Alert, Long> {
}
