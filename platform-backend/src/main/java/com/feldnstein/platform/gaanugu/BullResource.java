package com.feldnstein.platform.gaanugu;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;
import com.feldnstein.platform.gaanugu.BullRepository;

@ResourceProperties(path = "g/bulls", rolesAllowed = {"ADMIN", "OPERATOR"})
public interface BullResource extends PanacheRepositoryResource<BullRepository, Bull, Long> {
}
