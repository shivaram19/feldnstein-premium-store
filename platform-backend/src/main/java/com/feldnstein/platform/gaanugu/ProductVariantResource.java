package com.feldnstein.platform.gaanugu;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;
import com.feldnstein.platform.gaanugu.ProductVariantRepository;

@ResourceProperties(path = "g/product-variants", rolesAllowed = {"ADMIN", "OPERATOR"})
public interface ProductVariantResource extends PanacheRepositoryResource<ProductVariantRepository, ProductVariant, Long> {
}
