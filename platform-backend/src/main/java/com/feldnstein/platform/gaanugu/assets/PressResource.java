package com.feldnstein.platform.gaanugu.assets;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;

@ResourceProperties(path = "g/presses", rolesAllowed = {"ADMIN", "OPERATOR"})
public interface PressResource extends PanacheRepositoryResource<PressRepository, Press, Long> {
}
