package com.feldnstein.platform.gaanugu;

import io.quarkus.arc.Unremovable;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@Unremovable
@ApplicationScoped
public class PressOperatorRepository implements PanacheRepository<PressOperator> {
}
