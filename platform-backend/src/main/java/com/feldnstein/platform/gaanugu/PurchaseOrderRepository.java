package com.feldnstein.platform.gaanugu;

import io.quarkus.arc.Unremovable;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@Unremovable
@ApplicationScoped
public class PurchaseOrderRepository implements PanacheRepository<PurchaseOrder> {
}
