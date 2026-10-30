package com.feldnstein.platform.media;

import io.quarkus.runtime.Startup;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.util.ArrayList;
import java.util.List;

@Startup
@ApplicationScoped
public class MediaStorageConfig {

    private static final Logger LOG = Logger.getLogger(MediaStorageConfig.class);

    @ConfigProperty(name = "media.storage.type", defaultValue = "disk")
    String storageType;
    @ConfigProperty(name = "media.s3.endpoint") String endpoint;
    @ConfigProperty(name = "media.s3.bucket") String bucket;
    @ConfigProperty(name = "media.s3.access-key") String accessKey;
    @ConfigProperty(name = "media.s3.secret-key") String secretKey;

    private volatile boolean s3Usable = true;

    @PostConstruct
    void init() {  // @Startup makes this run at boot
        if (!"s3".equalsIgnoreCase(storageType)) return;
        List<String> missing = new ArrayList<>();
        if (isUnset(endpoint)) missing.add("MEDIA_S3_ENDPOINT");
        if (isUnset(bucket)) missing.add("MEDIA_S3_BUCKET");
        if (isUnset(accessKey)) missing.add("MEDIA_S3_ACCESS_KEY");
        if (isUnset(secretKey)) missing.add("MEDIA_S3_SECRET_KEY");
        if (!missing.isEmpty()) {
            s3Usable = false;
            LOG.warn("Media storage not configured: set " + String.join(", ", missing)
                    + " — media endpoints will return 503 until fixed");
        }
    }

    private static boolean isUnset(String v) {
        return v == null || v.isBlank() || "unset".equals(v);
    }

    /** false only when s3 is selected but its config is incomplete. */
    public boolean storageUsable() {
        return s3Usable;
    }
}
