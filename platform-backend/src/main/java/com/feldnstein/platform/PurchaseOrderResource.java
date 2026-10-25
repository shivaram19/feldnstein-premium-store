package com.feldnstein.platform;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;

@ResourceProperties(path = "purchase-orders")
public interface PurchaseOrderResource extends PanacheRepositoryResource<PurchaseOrderRepository, PurchaseOrder, Long> {
}
