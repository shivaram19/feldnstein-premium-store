package com.feldnstein.platform.gaanugu.catalog;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;

@ResourceProperties(path = "g/product-variants", rolesAllowed = {"ADMIN", "OPERATOR"})
public interface ProductVariantResource extends PanacheRepositoryResource<ProductVariantRepository, ProductVariant, Long> {
}
