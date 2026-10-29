package com.feldnstein.platform.gaanugu;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;
import com.feldnstein.platform.gaanugu.OperatorAttendanceRepository;

@ResourceProperties(path = "g/operator-attendances", rolesAllowed = {"ADMIN", "OPERATOR"})
public interface OperatorAttendanceResource extends PanacheRepositoryResource<OperatorAttendanceRepository, OperatorAttendance, Long> {
}
