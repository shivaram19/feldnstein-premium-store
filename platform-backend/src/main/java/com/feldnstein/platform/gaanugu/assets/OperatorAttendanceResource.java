package com.feldnstein.platform.gaanugu.assets;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;

@ResourceProperties(path = "g/operator-attendances", rolesAllowed = {"ADMIN", "OPERATOR"})
public interface OperatorAttendanceResource extends PanacheRepositoryResource<OperatorAttendanceRepository, OperatorAttendance, Long> {
}
