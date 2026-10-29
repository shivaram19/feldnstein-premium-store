package com.feldnstein.platform.gaanugu;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;

@ResourceProperties(path = "g/alert-rules", rolesAllowed = {"ADMIN", "OPERATOR"})
public interface AlertRuleResource extends PanacheRepositoryResource<AlertRuleRepository, AlertRule, Long> {
}
