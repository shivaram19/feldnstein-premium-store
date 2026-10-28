package com.feldnstein.platform.gaanugu;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;
import com.feldnstein.platform.gaanugu.BullWorkLogRepository;

@ResourceProperties(path = "g/bull-work-logs", rolesAllowed = {"ADMIN", "OPERATOR"})
public interface BullWorkLogResource extends PanacheRepositoryResource<BullWorkLogRepository, BullWorkLog, Long> {
}
