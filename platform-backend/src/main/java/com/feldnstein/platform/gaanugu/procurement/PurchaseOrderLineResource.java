package com.feldnstein.platform.gaanugu.procurement;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;

@ResourceProperties(path = "g/purchase-order-lines", rolesAllowed = {"ADMIN", "OPERATOR"})
public interface PurchaseOrderLineResource extends PanacheRepositoryResource<PurchaseOrderLineRepository, PurchaseOrderLine, Long> {
}
