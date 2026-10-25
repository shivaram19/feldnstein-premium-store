package com.feldnstein.platform;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;

@ResourceProperties(path = "products")
public interface ProductResource extends PanacheRepositoryResource<ProductRepository, Product, Long> {
}
