package com.feldnstein.platform.gaanugu;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;
import com.feldnstein.platform.gaanugu.PriceConfigRepository;

@ResourceProperties(path = "g/price-configs", rolesAllowed = {"ADMIN", "OPERATOR"})
public interface PriceConfigResource extends PanacheRepositoryResource<PriceConfigRepository, PriceConfig, Long> {
}
