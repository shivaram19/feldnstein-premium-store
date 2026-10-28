package com.feldnstein.platform.gaanugu;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;
import com.feldnstein.platform.gaanugu.AppUserRepository;

@ResourceProperties(path = "g/app-users", rolesAllowed = {"ADMIN", "OPERATOR"})
public interface AppUserResource extends PanacheRepositoryResource<AppUserRepository, AppUser, Long> {
}
