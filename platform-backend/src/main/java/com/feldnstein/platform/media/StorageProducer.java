package com.feldnstein.platform.media;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Produces;
import jakarta.inject.Singleton;
import org.eclipse.microprofile.config.inject.ConfigProperty;

public class StorageProducer {

    @ConfigProperty(name = "media.storage.type", defaultValue = "disk")
    String type;

    @Produces
    @Singleton
    public MediaStorage storage(LocalDiskStorage disk, S3Storage s3) {
        return "s3".equalsIgnoreCase(type) ? s3 : disk;
    }
}
