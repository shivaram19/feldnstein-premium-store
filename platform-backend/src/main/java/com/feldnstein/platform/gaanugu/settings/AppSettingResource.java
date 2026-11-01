package com.feldnstein.platform.gaanugu.settings;

import io.quarkus.hibernate.orm.rest.data.panache.PanacheRepositoryResource;
import io.quarkus.rest.data.panache.ResourceProperties;

@ResourceProperties(path = "g/settings", rolesAllowed = {"ADMIN"})
public interface AppSettingResource extends PanacheRepositoryResource<AppSettingRepository, AppSetting, Long> {
}
