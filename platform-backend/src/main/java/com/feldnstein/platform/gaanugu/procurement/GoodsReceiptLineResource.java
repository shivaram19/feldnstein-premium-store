package com.feldnstein.platform.gaanugu.procurement;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;

@ResourceProperties(path = "g/goods-receipt-lines", rolesAllowed = {"ADMIN", "OPERATOR"})
public interface GoodsReceiptLineResource extends PanacheRepositoryResource<GoodsReceiptLineRepository, GoodsReceiptLine, Long> {
}
