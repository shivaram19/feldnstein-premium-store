package com.feldnstein.platform.gaanugu.procurement;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;

@ResourceProperties(path = "g/suppliers", rolesAllowed = {"ADMIN", "OPERATOR"})
public interface SupplierResource extends PanacheRepositoryResource<SupplierRepository, Supplier, Long> {
}
