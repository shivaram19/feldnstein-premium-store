package com.feldnstein.platform.gaanugu;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;
import com.feldnstein.platform.gaanugu.GoodsReceiptLineRepository;

@ResourceProperties(path = "g/goods-receipt-lines", rolesAllowed = {"ADMIN", "OPERATOR"})
public interface GoodsReceiptLineResource extends PanacheRepositoryResource<GoodsReceiptLineRepository, GoodsReceiptLine, Long> {
}
