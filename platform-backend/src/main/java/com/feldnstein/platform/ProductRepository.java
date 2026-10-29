package com.feldnstein.platform;

import io.quarkus.arc.Unremovable;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@Unremovable
@ApplicationScoped
public class ProductRepository implements PanacheRepository<Product> {
}
