package com.feldnstein.platform.gaanugu;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;
import com.feldnstein.platform.gaanugu.OilProductRepository;

@ResourceProperties(path = "g/oil-products", rolesAllowed = {"ADMIN", "OPERATOR"})
public interface OilProductResource extends PanacheRepositoryResource<OilProductRepository, OilProduct, Long> {
}
