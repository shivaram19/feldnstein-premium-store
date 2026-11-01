package com.feldnstein.platform.gaanugu.procurement;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;

@ResourceProperties(path = "g/goods-receipts", rolesAllowed = {"ADMIN", "OPERATOR"})
public interface GoodsReceiptResource extends PanacheRepositoryResource<GoodsReceiptRepository, GoodsReceipt, Long> {
}
