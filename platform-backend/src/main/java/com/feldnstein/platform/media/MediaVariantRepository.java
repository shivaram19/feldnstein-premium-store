package com.feldnstein.platform.media;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class MediaVariantRepository implements PanacheRepository<MediaVariant> {}
