package com.feldnstein.platform.gaanugu.procurement;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;

@ResourceProperties(path = "g/purchase-orders", rolesAllowed = {"ADMIN", "OPERATOR"})
public interface PurchaseOrderResource extends PanacheRepositoryResource<PurchaseOrderRepository, PurchaseOrder, Long> {
}
