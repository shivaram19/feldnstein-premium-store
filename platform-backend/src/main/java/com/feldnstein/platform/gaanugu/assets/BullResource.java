package com.feldnstein.platform.gaanugu.assets;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;

@ResourceProperties(path = "g/bulls", rolesAllowed = {"ADMIN", "OPERATOR"})
public interface BullResource extends PanacheRepositoryResource<BullRepository, Bull, Long> {
}
