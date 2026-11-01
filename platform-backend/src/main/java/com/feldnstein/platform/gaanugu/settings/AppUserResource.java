package com.feldnstein.platform.gaanugu.settings;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;

@ResourceProperties(path = "g/app-users", rolesAllowed = {"ADMIN", "OPERATOR"})
public interface AppUserResource extends PanacheRepositoryResource<AppUserRepository, AppUser, Long> {
}
