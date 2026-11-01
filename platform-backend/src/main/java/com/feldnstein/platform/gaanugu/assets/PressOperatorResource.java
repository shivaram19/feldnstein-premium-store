package com.feldnstein.platform.gaanugu.assets;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;

@ResourceProperties(path = "g/press-operators", rolesAllowed = {"ADMIN", "OPERATOR"})
public interface PressOperatorResource extends PanacheRepositoryResource<PressOperatorRepository, PressOperator, Long> {
}
