package com.feldnstein.platform.media;

import jakarta.enterprise.context.ApplicationScoped;
import io.quarkus.arc.lookup.LookupIfProperty;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.time.Duration;
import java.net.URI;
import java.util.Map;

@ApplicationScoped
@LookupIfProperty(name = "media.storage.type", stringValue = "s3")
public class S3Storage implements MediaStorage {

    @ConfigProperty(name = "media.s3.endpoint") String endpoint;
    @ConfigProperty(name = "media.s3.bucket") String bucket;
    @ConfigProperty(name = "media.s3.access-key") String accessKey;
    @ConfigProperty(name = "media.s3.secret-key") String secretKey;
    @ConfigProperty(name = "media.s3.region", defaultValue = "auto") String region;

    private volatile S3Client client;
    private volatile S3Presigner presigner;

    private S3Client client() {
        S3Client c = client;
        if (c == null) {
            synchronized (this) {
                c = client;
                if (c == null) {
                    c = S3Client.builder()
                            .endpointOverride(URI.create(endpoint))
                            .region(Region.of(region))
                            .credentialsProvider(StaticCredentialsProvider.create(
                                    AwsBasicCredentials.create(accessKey, secretKey)))
                            .build();
                    client = c;
                }
            }
        }
        return c;
    }

    private S3Presigner presigner() {
        S3Presigner p = presigner;
        if (p == null) {
            synchronized (this) {
                p = presigner;
                if (p == null) {
                    p = S3Presigner.builder()
                            .endpointOverride(URI.create(endpoint))
                            .region(Region.of(region))
                            .credentialsProvider(StaticCredentialsProvider.create(
                                    AwsBasicCredentials.create(accessKey, secretKey)))
                            .build();
                    presigner = p;
                }
            }
        }
        return p;
    }

    @jakarta.annotation.PreDestroy
    void close() {
        if (client != null) client.close();
        if (presigner != null) presigner.close();
    }

    @Override
    public UploadTarget presignPut(String storageKey, String contentType, long sizeBytes) {
        var put = PutObjectRequest.builder().bucket(bucket).key(storageKey).contentType(contentType).build();
        var presigned = presigner().presignPutObject(PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(10)).putObjectRequest(put).build());
        return new UploadTarget(presigned.url().toString(), "PUT",
                Map.of("Content-Type", contentType), storageKey);
    }

    @Override
    public byte[] read(String storageKey) {
        try (InputStream in = client().getObject(GetObjectRequest.builder().bucket(bucket).key(storageKey).build())) {
            return in.readAllBytes();
        } catch (NoSuchKeyException e) {
            throw new MediaObjectNotFoundException(storageKey);
        } catch (S3Exception e) {
            throw new IllegalStateException("s3 read failed: " + e.awsErrorDetails().errorMessage(), e);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Override
    public void write(String storageKey, InputStream bytes, long sizeBytes, String contentType) {
        try {
            client().putObject(PutObjectRequest.builder().bucket(bucket).key(storageKey).contentType(contentType).build(),
                    software.amazon.awssdk.core.sync.RequestBody.fromInputStream(bytes, sizeBytes));
        } catch (Exception e) {
            throw new IllegalStateException("s3 write failed: " + e.getMessage(), e);
        }
    }

    @Override
    public void delete(String storageKey) {
        client().deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(storageKey).build());
    }
}
