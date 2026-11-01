package com.feldnstein.platform.gaanugu.catalog;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;

@ResourceProperties(path = "g/oil-products", rolesAllowed = {"ADMIN", "OPERATOR"})
public interface OilProductResource extends PanacheRepositoryResource<OilProductRepository, OilProduct, Long> {
}
