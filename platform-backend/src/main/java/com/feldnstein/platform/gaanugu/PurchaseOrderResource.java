package com.feldnstein.platform.gaanugu;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;
import com.feldnstein.platform.gaanugu.PurchaseOrderRepository;

@ResourceProperties(path = "g/purchase-orders", rolesAllowed = {"ADMIN", "OPERATOR"})
public interface PurchaseOrderResource extends PanacheRepositoryResource<PurchaseOrderRepository, PurchaseOrder, Long> {
}
