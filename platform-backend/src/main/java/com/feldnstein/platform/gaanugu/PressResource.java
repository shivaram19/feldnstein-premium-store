package com.feldnstein.platform.gaanugu;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;
import com.feldnstein.platform.gaanugu.PressRepository;

@ResourceProperties(path = "g/presses", rolesAllowed = {"ADMIN", "OPERATOR"})
public interface PressResource extends PanacheRepositoryResource<PressRepository, Press, Long> {
}
