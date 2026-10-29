package com.feldnstein.platform.gaanugu;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;
import com.feldnstein.platform.gaanugu.QualityCheckRepository;

@ResourceProperties(path = "g/quality-checks", rolesAllowed = {"ADMIN", "OPERATOR"})
public interface QualityCheckResource extends PanacheRepositoryResource<QualityCheckRepository, QualityCheck, Long> {
}
