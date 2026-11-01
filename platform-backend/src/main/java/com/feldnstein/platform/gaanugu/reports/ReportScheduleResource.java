package com.feldnstein.platform.gaanugu.reports;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;

@ResourceProperties(path = "g/report-schedules", rolesAllowed = {"ADMIN"})
public interface ReportScheduleResource extends PanacheRepositoryResource<ReportScheduleRepository, ReportSchedule, Long> {
}
