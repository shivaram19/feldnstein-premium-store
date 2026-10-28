package com.feldnstein.platform.gaanugu;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;
import com.feldnstein.platform.gaanugu.PurchaseOrderLineRepository;

@ResourceProperties(path = "g/purchase-order-lines", rolesAllowed = {"ADMIN", "OPERATOR"})
public interface PurchaseOrderLineResource extends PanacheRepositoryResource<PurchaseOrderLineRepository, PurchaseOrderLine, Long> {
}
