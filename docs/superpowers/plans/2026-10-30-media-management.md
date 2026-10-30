# Central Media & Content Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Staff upload photos and edit site copy from platform-admin; images auto-conform to slot specs; the feldnstein-react storefront renders live content with static fallback.

**Architecture:** Approach A from `docs/superpowers/specs/2026-10-30-media-management-design.md` — everything in the existing Quarkus backend (Flyway V8, new entities, storage abstraction with S3/R2 + local-disk impls, presigned direct upload, scheduled variant worker, public `/site/*` endpoints) + two new admin screens + storefront ContentContext. Two documented simplifications: (1) every uploaded asset generates all four variants (card/hero/banner/thumb) — the library is generic rather than per-slot; (2) media bytes are served through a cache-safe backend proxy endpoint (`GET /site/media/file/{key}`, content-addressed keys, `Cache-Control: immutable`) instead of public R2 URLs, and content blocks store resolved image URLs (inserted by the admin pickers) rather than asset references.

**Tech Stack:** Quarkus 3.20 (Panache, Flyway, Scheduler), software.amazon.awssdk:s3, net.coobird:thumbnailator, React admin SPA, React 19 storefront.

**Repo conventions the implementer must know:**
- Backend root package `com.feldnstein.platform`; gaanugu domain is flat in `com.feldnstein.platform.gaanugu`. New media code goes in a new package `com.feldnstein.platform.media` (first sub-package).
- Entities: `PanacheEntity` public fields, `@Table(name="snake_case")`, enums `@Enumerated(STRING)`.
- Migrations: `platform-backend/src/main/resources/db/migration/V<n>__*.sql`; every new table needs `CREATE SEQUENCE IF NOT EXISTS <table>_SEQ START WITH 1000 INCREMENT BY 50;` (Hibernate pooled sequences — see V7).
- Auth: `@RolesAllowed({"ADMIN","OPERATOR"})` on resources; **no annotation = public** (that's how `/site/*` stays open).
- No Hibernate Validator — manual checks; throw `NotFoundException("msg")`; records for DTOs; `@Transactional` on mutations; `@Audited("ACTION")` on state-changing endpoints.
- Async: `@Unremovable @ApplicationScoped` bean, `@Scheduled(every="...")`, `QuarkusTransaction.requiringNew().run(...)`.
- Dev build: `JAVA_HOME=$PWD/.tools/jdk-21 .tools/apache-maven-3.9.9/bin/mvn -q -f platform-backend/pom.xml compile` (from repo root). Dev server: `... mvn -q -f platform-backend/pom.xml quarkus:dev` on :8080, H2 in-mem.
- Dev H2 gotcha: Flyway migrations are checksum-checked; never edit an applied migration without a fresh DB restart.
- Admin app: `platform-admin/` — `npx tsc --noEmit && npm run build` must stay green. API client: `gaanugu` from `src/gaanugu-api.ts` (`gaanugu.list/get/create/update/post`), all paths prefixed `/g` there.
- Storefront: `feldnstein-react/` — `npm run build`, `node smoke-test.mjs`.
- E2E: `python3 scripts/e2e-business-flows.py` (default base http://localhost:8080) must stay green; append new cases at the end of the file following its existing `check()` helper pattern.

---

### Task 1: Backend dependencies and config

**Files:**
- Modify: `platform-backend/pom.xml`
- Modify: `platform-backend/src/main/resources/application.properties`

- [ ] **Step 1: Add dependencies to pom.xml** (inside `<dependencies>`, no versions — BOM manages Quarkus ones; pin the other two):

```xml
<dependency>
  <groupId>software.amazon.awssdk</groupId>
  <artifactId>s3</artifactId>
  <version>2.28.29</version>
</dependency>
<dependency>
  <groupId>net.coobird</groupId>
  <artifactId>thumbnailator</artifactId>
  <version>0.4.20</version>
</dependency>
```

- [ ] **Step 2: Add media config to application.properties** (after the CORS block):

```properties
# --- media storage (ADR: media management spec) ---
# 'disk' in dev (files under platform-backend/media/), 's3' in prod (R2/S3-compatible)
media.storage.type=${MEDIA_STORAGE_TYPE:disk}
media.disk.dir=${MEDIA_DISK_DIR:media}
media.upload.max-bytes=${MEDIA_UPLOAD_MAX_BYTES:10485760}
media.s3.endpoint=${MEDIA_S3_ENDPOINT:}
media.s3.bucket=${MEDIA_S3_BUCKET:}
media.s3.access-key=${MEDIA_S3_ACCESS_KEY:}
media.s3.secret-key=${MEDIA_S3_SECRET_KEY:}
media.s3.region=${MEDIA_S3_REGION:auto}
%prod.media.storage.type=${MEDIA_STORAGE_TYPE:s3}
```

- [ ] **Step 3: Compile**

Run: `JAVA_HOME=$PWD/.tools/jdk-21 .tools/apache-maven-3.9.9/bin/mvn -q -f platform-backend/pom.xml compile`
Expected: BUILD SUCCESS (no output with -q)

- [ ] **Step 4: Commit**

```bash
git add platform-backend/pom.xml platform-backend/src/main/resources/application.properties
git commit -m "media: s3 + thumbnailator deps and storage config"
```

---

### Task 2: Flyway V8 schema

**Files:**
- Create: `platform-backend/src/main/resources/db/migration/V8__media_content_schema.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Media & content management (spec 2026-10-30): assets, generated variants,
-- site content blocks, per-product marketing overrides.

CREATE TABLE media_asset (
  id                BIGINT NOT NULL PRIMARY KEY,
  asset_key         VARCHAR(128) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  content_type      VARCHAR(64)  NOT NULL,
  size_bytes        BIGINT       NOT NULL,
  alt_text          VARCHAR(255),
  status            VARCHAR(16)  NOT NULL DEFAULT 'DRAFT',
  finalized         BOOLEAN      NOT NULL DEFAULT FALSE,
  error_note        VARCHAR(500),
  storage_key       VARCHAR(255) NOT NULL,
  created_by        VARCHAR(64),
  created_at        TIMESTAMP    NOT NULL,
  updated_at        TIMESTAMP    NOT NULL,
  CONSTRAINT uk_media_asset_key UNIQUE (asset_key)
);
CREATE SEQUENCE IF NOT EXISTS media_asset_SEQ START WITH 1000 INCREMENT BY 50;

CREATE TABLE media_variant (
  id           BIGINT NOT NULL PRIMARY KEY,
  asset_id     BIGINT NOT NULL,
  variant_name VARCHAR(16)  NOT NULL,
  width        INT          NOT NULL,
  height       INT          NOT NULL,
  storage_key  VARCHAR(255) NOT NULL,
  CONSTRAINT fk_media_variant_asset FOREIGN KEY (asset_id) REFERENCES media_asset (id),
  CONSTRAINT uk_media_variant UNIQUE (asset_id, variant_name)
);
CREATE SEQUENCE IF NOT EXISTS media_variant_SEQ START WITH 1000 INCREMENT BY 50;

CREATE TABLE content_block (
  id         BIGINT NOT NULL PRIMARY KEY,
  block_key  VARCHAR(128) NOT NULL,
  payload    TEXT         NOT NULL,
  updated_by VARCHAR(64),
  updated_at TIMESTAMP    NOT NULL,
  CONSTRAINT uk_content_block_key UNIQUE (block_key)
);
CREATE SEQUENCE IF NOT EXISTS content_block_SEQ START WITH 1000 INCREMENT BY 50;

CREATE TABLE product_marketing (
  id            BIGINT NOT NULL PRIMARY KEY,
  product_id    BIGINT NOT NULL,
  badge         VARCHAR(128),
  short_desc    VARCHAR(500),
  long_desc     TEXT,
  card_asset_id BIGINT,
  CONSTRAINT fk_pm_product FOREIGN KEY (product_id) REFERENCES oil_product (id),
  CONSTRAINT fk_pm_asset FOREIGN KEY (card_asset_id) REFERENCES media_asset (id),
  CONSTRAINT uk_pm_product UNIQUE (product_id)
);
CREATE SEQUENCE IF NOT EXISTS product_marketing_SEQ START WITH 1000 INCREMENT BY 50;
```

- [ ] **Step 2: Verify migration applies** — restart the dev backend if running (kill JVM; do not edit applied migrations):

```bash
PID=$(pgrep -f 'platform-backend-dev.jar' | head -1); [ -n "$PID" ] && kill -9 $PID
JAVA_HOME=$PWD/.tools/jdk-21 .tools/apache-maven-3.9.9/bin/mvn -q -f platform-backend/pom.xml quarkus:dev &
sleep 45; curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/q/health
```
Expected: `200`, and the log shows `Migrating schema "public" to version "8 - media content schema"`.

- [ ] **Step 3: Commit**

```bash
git add platform-backend/src/main/resources/db/migration/V8__media_content_schema.sql
git commit -m "media: V8 schema — assets, variants, content blocks, product marketing"
```

---

### Task 3: JPA entities and repositories

**Files:**
- Create: `platform-backend/src/main/java/com/feldnstein/platform/media/MediaAsset.java`
- Create: `platform-backend/src/main/java/com/feldnstein/platform/media/MediaVariant.java`
- Create: `platform-backend/src/main/java/com/feldnstein/platform/media/ContentBlock.java`
- Create: `platform-backend/src/main/java/com/feldnstein/platform/media/ProductMarketing.java`
- Create: `platform-backend/src/main/java/com/feldnstein/platform/media/MediaAssetRepository.java`
- Create: `platform-backend/src/main/java/com/feldnstein/platform/media/MediaVariantRepository.java`
- Create: `platform-backend/src/main/java/com/feldnstein/platform/media/ContentBlockRepository.java`
- Create: `platform-backend/src/main/java/com/feldnstein/platform/media/ProductMarketingRepository.java`

- [ ] **Step 1: Write the entities**

```java
// MediaAsset.java
package com.feldnstein.platform.media;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "media_asset")
public class MediaAsset extends PanacheEntity {

    public enum Status { DRAFT, PROCESSING, READY, PUBLISHED, ERROR }

    @Column(name = "asset_key", nullable = false, length = 128)
    public String assetKey;

    @Column(name = "original_filename", nullable = false, length = 255)
    public String originalFilename;

    @Column(name = "content_type", nullable = false, length = 64)
    public String contentType;

    @Column(name = "size_bytes", nullable = false)
    public long sizeBytes;

    @Column(name = "alt_text", length = 255)
    public String altText;

    @jakarta.persistence.Enumerated(jakarta.persistence.EnumType.STRING)
    @Column(nullable = false, length = 16)
    public Status status = Status.DRAFT;

    @Column(nullable = false)
    public boolean finalized;

    @Column(name = "error_note", length = 500)
    public String errorNote;

    @Column(name = "storage_key", nullable = false, length = 255)
    public String storageKey;

    @Column(name = "created_by", length = 64)
    public String createdBy;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    public Instant updatedAt;

    @PrePersist void onCreate() { Instant now = Instant.now(); createdAt = now; updatedAt = now; }
    @PreUpdate void onUpdate() { updatedAt = Instant.now(); }
}
```

```java
// MediaVariant.java
package com.feldnstein.platform.media;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "media_variant")
public class MediaVariant extends PanacheEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_id", nullable = false)
    @JsonIgnore
    public MediaAsset asset;

    @Column(name = "variant_name", nullable = false, length = 16)
    public String variantName;

    @Column(nullable = false)
    public int width;

    @Column(nullable = false)
    public int height;

    @Column(name = "storage_key", nullable = false, length = 255)
    public String storageKey;
}
```

```java
// ContentBlock.java
package com.feldnstein.platform.media;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "content_block")
public class ContentBlock extends PanacheEntity {

    @Column(name = "block_key", nullable = false, length = 128)
    public String blockKey;

    @Column(nullable = false, columnDefinition = "TEXT")
    public String payload;

    @Column(name = "updated_by", length = 64)
    public String updatedBy;

    @Column(name = "updated_at", nullable = false)
    public Instant updatedAt;

    @PrePersist @PreUpdate void touch() { updatedAt = Instant.now(); }
}
```

```java
// ProductMarketing.java
package com.feldnstein.platform.media;

import com.feldnstein.platform.gaanugu.OilProduct;
import com.fasterxml.jackson.annotation.JsonIgnore;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "product_marketing")
public class ProductMarketing extends PanacheEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    @JsonIgnore
    public OilProduct product;

    @Column(length = 128)
    public String badge;

    @Column(name = "short_desc", length = 500)
    public String shortDesc;

    @Column(name = "long_desc", columnDefinition = "TEXT")
    public String longDesc;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "card_asset_id")
    @JsonIgnore
    public MediaAsset cardAsset;
}
```

- [ ] **Step 2: Write the repositories** (all four are one-liners of the same shape):

```java
package com.feldnstein.platform.media;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class MediaAssetRepository implements PanacheRepository<MediaAsset> {}
```
```java
package com.feldnstein.platform.media;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class MediaVariantRepository implements PanacheRepository<MediaVariant> {}
```
```java
package com.feldnstein.platform.media;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class ContentBlockRepository implements PanacheRepository<ContentBlock> {}
```
```java
package com.feldnstein.platform.media;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class ProductMarketingRepository implements PanacheRepository<ProductMarketing> {}
```

- [ ] **Step 3: Compile** — same mvn command as Task 1 Step 3. Expected: BUILD SUCCESS.

- [ ] **Step 4: Commit**

```bash
git add platform-backend/src/main/java/com/feldnstein/platform/media/
git commit -m "media: entities + repositories for assets, variants, content blocks, marketing"
```

---

### Task 4: Storage abstraction (disk + S3)

**Files:**
- Create: `platform-backend/src/main/java/com/feldnstein/platform/media/MediaStorage.java`
- Create: `platform-backend/src/main/java/com/feldnstein/platform/media/LocalDiskStorage.java`
- Create: `platform-backend/src/main/java/com/feldnstein/platform/media/S3Storage.java`
- Create: `platform-backend/src/main/java/com/feldnstein/platform/media/StorageProducer.java`

- [ ] **Step 1: Write the interface and record**

```java
// MediaStorage.java
package com.feldnstein.platform.media;

import java.io.InputStream;
import java.util.Map;

public interface MediaStorage {

    /** Result of creating an upload target. uploadUrl is absolute (S3) or API-relative (disk). */
    record UploadTarget(String uploadUrl, String method, Map<String, String> headers, String storageKey) {}

    UploadTarget presignPut(String storageKey, String contentType, long sizeBytes);

    /** Read object bytes; throw NotFoundException-equivalent IllegalStateException if missing. */
    byte[] read(String storageKey);

    void write(String storageKey, InputStream bytes, long sizeBytes, String contentType);

    void delete(String storageKey);
}
```

- [ ] **Step 2: Write LocalDiskStorage**

```java
// LocalDiskStorage.java
package com.feldnstein.platform.media;

import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

@ApplicationScoped
public class LocalDiskStorage implements MediaStorage {

    @ConfigProperty(name = "media.disk.dir", defaultValue = "media")
    String dir;

    private Path root() {
        try {
            Path p = Path.of(dir).toAbsolutePath().normalize();
            Files.createDirectories(p);
            return p;
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private Path resolve(String storageKey) {
        Path p = root().resolve(storageKey).normalize();
        if (!p.startsWith(root())) throw new IllegalArgumentException("bad storage key");
        return p;
    }

    @Override
    public UploadTarget presignPut(String storageKey, String contentType, long sizeBytes) {
        // API-relative — the admin client prefixes its API base, same as every other call.
        return new UploadTarget("/g/media/dev-upload/" + storageKey, "PUT",
                Map.of("Content-Type", contentType), storageKey);
    }

    @Override
    public byte[] read(String storageKey) {
        try {
            return Files.readAllBytes(resolve(storageKey));
        } catch (IOException e) {
            throw new IllegalStateException("media object not found: " + storageKey);
        }
    }

    @Override
    public void write(String storageKey, InputStream bytes, long sizeBytes, String contentType) {
        try {
            Path p = resolve(storageKey);
            Files.createDirectories(p.getParent());
            Files.copy(bytes, p, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Override
    public void delete(String storageKey) {
        try {
            Files.deleteIfExists(resolve(storageKey));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
```

- [ ] **Step 3: Write S3Storage**

```java
// S3Storage.java
package com.feldnstein.platform.media;

import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.net.URI;
import java.time.Duration;
import java.util.Map;

@ApplicationScoped
public class S3Storage implements MediaStorage {

    @ConfigProperty(name = "media.s3.endpoint") String endpoint;
    @ConfigProperty(name = "media.s3.bucket") String bucket;
    @ConfigProperty(name = "media.s3.access-key") String accessKey;
    @ConfigProperty(name = "media.s3.secret-key") String secretKey;
    @ConfigProperty(name = "media.s3.region", defaultValue = "auto") String region;

    private volatile S3Client client;
    private volatile S3Presigner presigner;

    private S3Client client() {
        if (client == null) {
            client = S3Client.builder()
                    .endpointOverride(URI.create(endpoint))
                    .region(Region.of(region))
                    .credentialsProvider(StaticCredentialsProvider.create(
                            AwsBasicCredentials.create(accessKey, secretKey)))
                    .build();
        }
        return client;
    }

    private S3Presigner presigner() {
        if (presigner == null) {
            presigner = S3Presigner.builder()
                    .endpointOverride(URI.create(endpoint))
                    .region(Region.of(region))
                    .credentialsProvider(StaticCredentialsProvider.create(
                            AwsBasicCredentials.create(accessKey, secretKey)))
                    .build();
        }
        return presigner;
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
        } catch (IOException e) {
            throw new IllegalStateException("media object not found: " + storageKey);
        }
    }

    @Override
    public void write(String storageKey, InputStream bytes, long sizeBytes, String contentType) {
        try {
            client().putObject(PutObjectRequest.builder().bucket(bucket).key(storageKey).contentType(contentType).build(),
                    software.amazon.awssdk.core.sync.RequestBody.fromInputStream(bytes, sizeBytes));
        } catch (Exception e) {
            throw new IllegalStateException("s3 write failed: " + e.getMessage());
        }
    }

    @Override
    public void delete(String storageKey) {
        client().deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(storageKey).build());
    }
}
```

- [ ] **Step 4: Write the producer**

```java
// StorageProducer.java
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
```

- [ ] **Step 5: Add `.gitignore` entry** — append `platform-backend/media/` to the repo-root `.gitignore`.

- [ ] **Step 6: Compile** (same command). Expected: BUILD SUCCESS.

- [ ] **Step 7: Commit**

```bash
git add platform-backend/src/main/java/com/feldnstein/platform/media/ .gitignore
git commit -m "media: storage abstraction — local disk (dev) + s3-compatible (prod)"
```

---

### Task 5: MediaService, variant worker, and /g/media endpoints

**Files:**
- Create: `platform-backend/src/main/java/com/feldnstein/platform/media/SlotSpecs.java`
- Create: `platform-backend/src/main/java/com/feldnstein/platform/media/ImageVariants.java`
- Create: `platform-backend/src/main/java/com/feldnstein/platform/media/MediaService.java`
- Create: `platform-backend/src/main/java/com/feldnstein/platform/media/VariantWorker.java`
- Create: `platform-backend/src/main/java/com/feldnstein/platform/media/MediaResource.java`

- [ ] **Step 1: SlotSpecs + ImageVariants**

```java
// SlotSpecs.java
package com.feldnstein.platform.media;

import java.util.List;

public final class SlotSpecs {
    public record Slot(String name, int ratioW, int ratioH, int width, int height) {}

    public static final List<Slot> ALL = List.of(
            new Slot("card",   4,  5,  800, 1000),
            new Slot("hero",  16,  9,  1920, 1080),
            new Slot("banner",21,  9,  1680, 720),
            new Slot("thumb",  4,  5,  200,  250));

    private SlotSpecs() {}
}
```

```java
// ImageVariants.java
package com.feldnstein.platform.media;

import net.coobird.thumbnailator.Thumbnails;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;

public final class ImageVariants {

    /** Center-crop original to the slot ratio, resize to slot dimensions, output JPEG. */
    public static byte[] render(byte[] original, SlotSpecs.Slot slot) {
        try {
            BufferedImage src = ImageIO.read(new ByteArrayInputStream(original));
            if (src == null) throw new IllegalArgumentException("not a decodable image");
            double srcRatio = (double) src.getWidth() / src.getHeight();
            double targetRatio = (double) slot.ratioW() / slot.ratioH();
            int cropW = src.getWidth(), cropH = src.getHeight();
            if (srcRatio > targetRatio) {
                cropW = (int) Math.round(src.getHeight() * targetRatio);
            } else {
                cropH = (int) Math.round(src.getWidth() / targetRatio);
            }
            int x = (src.getWidth() - cropW) / 2;
            int y = (src.getHeight() - cropH) / 2;
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            Thumbnails.of(src)
                    .sourceRegion(x, y, cropW, cropH)
                    .forceSize(slot.width(), slot.height())
                    .outputFormat("jpg")
                    .outputQuality(0.85)
                    .toOutputStream(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** Magic-byte sniffing — a presigned PUT pins content-type but NOT size or real bytes. */
    public static String sniffContentType(byte[] bytes) {
        if (bytes.length >= 3 && (bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8 && (bytes[2] & 0xFF) == 0xFF)
            return "image/jpeg";
        if (bytes.length >= 8 && (bytes[0] & 0xFF) == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47)
            return "image/png";
        if (bytes.length >= 12 && bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46
                && bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50)
            return "image/webp";
        return null;
    }

    private ImageVariants() {}
}
```

- [ ] **Step 2: MediaService**

```java
// MediaService.java
package com.feldnstein.platform.media;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@ApplicationScoped
public class MediaService {

    @Inject MediaStorage storage;
    @Inject MediaAssetRepository assets;
    @Inject MediaVariantRepository variants;
    @ConfigProperty(name = "media.upload.max-bytes", defaultValue = "10485760")
    long maxBytes;

    public record PresignRequest(String assetKey, String filename, String contentType, long sizeBytes) {}
    public record PresignResponse(long assetId, String storageKey, String uploadUrl, String method,
                                  Map<String, String> headers) {}

    @Transactional
    public PresignResponse presign(PresignRequest req, String user) {
        if (req.assetKey() == null || req.assetKey().isBlank() || !req.assetKey().matches("[a-z0-9:_-]{3,128}"))
            throw new IllegalArgumentException("assetKey must be 3-128 chars of a-z 0-9 : _ -");
        if (assets.find("assetKey", req.assetKey()).firstResult() != null)
            throw new IllegalArgumentException("assetKey already in use: " + req.assetKey());
        if (req.sizeBytes() <= 0 || req.sizeBytes() > maxBytes)
            throw new IllegalArgumentException("file must be 1 byte .. " + maxBytes + " bytes");
        String ct = req.contentType() == null ? "" : req.contentType();
        if (!ct.equals("image/jpeg") && !ct.equals("image/png") && !ct.equals("image/webp"))
            throw new IllegalArgumentException("only image/jpeg, image/png, image/webp allowed");
        String slug = req.filename() == null ? "upload" : req.filename().replaceAll("[^A-Za-z0-9._-]", "_");
        MediaAsset asset = new MediaAsset();
        asset.assetKey = req.assetKey();
        asset.originalFilename = slug;
        asset.contentType = ct;
        asset.sizeBytes = req.sizeBytes();
        asset.status = MediaAsset.Status.DRAFT;
        asset.storageKey = "orig/" + slug;
        asset.createdBy = user;
        asset.persist();
        // key must be unique per asset — prefix with id now that we have it
        asset.storageKey = "orig/" + asset.id + "-" + slug;
        MediaStorage.UploadTarget target = storage.presignPut(asset.storageKey, ct, req.sizeBytes());
        return new PresignResponse(asset.id, asset.storageKey, target.uploadUrl(), target.method(), target.headers());
    }

    /** Local-disk profile only: receive the raw bytes the browser would have PUT to S3. */
    @Transactional
    public void devUpload(String storageKey, byte[] bytes, String contentType) {
        storage.write(storageKey, new java.io.ByteArrayInputStream(bytes), bytes.length, contentType);
    }

    /** Verify the uploaded object (size + magic bytes), then queue variant generation. */
    @Transactional
    public void finalizeAsset(long id) {
        MediaAsset asset = assets.findById(id);
        if (asset == null) throw new NotFoundException("asset not found");
        byte[] bytes = storage.read(asset.storageKey);
        if (bytes.length == 0 || bytes.length > maxBytes) {
            fail(asset, "uploaded file missing or over the size limit");
            throw new IllegalArgumentException("uploaded file missing or over the size limit");
        }
        String sniffed = ImageVariants.sniffContentType(bytes);
        if (sniffed == null) {
            fail(asset, "file is not a decodable jpeg, png, or webp image");
            throw new IllegalArgumentException("file is not a decodable jpeg, png, or webp image");
        }
        asset.contentType = sniffed;
        asset.sizeBytes = bytes.length;
        asset.finalized = true;
        asset.status = MediaAsset.Status.DRAFT; // worker picks it up
        asset.errorNote = null;
    }

    private void fail(MediaAsset asset, String note) {
        asset.status = MediaAsset.Status.ERROR;
        asset.errorNote = note;
        storage.delete(asset.storageKey);
    }

    /** Called by VariantWorker inside its own transaction. */
    @Transactional
    public void processOne(MediaAsset asset) {
        asset.status = MediaAsset.Status.PROCESSING;
        byte[] original = storage.read(asset.storageKey);
        variants.delete("asset", asset);
        for (SlotSpecs.Slot slot : SlotSpecs.ALL) {
            byte[] rendered = ImageVariants.render(original, slot);
            String key = "var/" + asset.id + "/" + slot.name() + ".jpg";
            storage.write(key, new java.io.ByteArrayInputStream(rendered), rendered.length, "image/jpeg");
            MediaVariant v = new MediaVariant();
            v.asset = asset;
            v.variantName = slot.name();
            v.width = slot.width();
            v.height = slot.height();
            v.storageKey = key;
            v.persist();
        }
        asset.status = MediaAsset.Status.READY;
        asset.errorNote = null;
    }

    @Transactional
    public void markError(MediaAsset asset, String note) {
        asset.status = MediaAsset.Status.ERROR;
        asset.errorNote = note;
    }

    @Transactional
    public void retry(long id) {
        MediaAsset asset = assets.findById(id);
        if (asset == null) throw new NotFoundException("asset not found");
        if (!asset.finalized) throw new IllegalArgumentException("asset has no uploaded file");
        variants.delete("asset", asset);
        asset.status = MediaAsset.Status.DRAFT;
        asset.errorNote = null;
    }

    @Transactional
    public void setPublished(long id, boolean published) {
        MediaAsset asset = assets.findById(id);
        if (asset == null) throw new NotFoundException("asset not found");
        if (published && asset.status != MediaAsset.Status.READY && asset.status != MediaAsset.Status.PUBLISHED)
            throw new IllegalArgumentException("asset must be READY before publishing");
        asset.status = published ? MediaAsset.Status.PUBLISHED : MediaAsset.Status.READY;
    }

    @Transactional
    public void updateMeta(long id, String assetKey, String altText) {
        MediaAsset asset = assets.findById(id);
        if (asset == null) throw new NotFoundException("asset not found");
        if (assetKey != null && !assetKey.isBlank() && !assetKey.equals(asset.assetKey)) {
            if (assets.find("assetKey", assetKey).firstResult() != null)
                throw new IllegalArgumentException("assetKey already in use: " + assetKey);
            asset.assetKey = assetKey;
        }
        if (altText != null) asset.altText = altText;
    }

    @Transactional
    public void delete(long id) {
        MediaAsset asset = assets.findById(id);
        if (asset == null) throw new NotFoundException("asset not found");
        if (asset.status == MediaAsset.Status.PUBLISHED)
            throw new IllegalArgumentException("unpublish before deleting");
        for (MediaVariant v : variants.list("asset", asset)) storage.delete(v.storageKey);
        storage.delete(asset.storageKey);
        variants.delete("asset", asset);
        assets.delete(asset);
    }

    /** Variant URL for a slot, or null. Used by site endpoints. */
    public String variantUrl(MediaAsset asset, String slotName) {
        MediaVariant v = variants.find("asset ?1 and variantName ?2", asset, slotName).firstResult();
        return v == null ? null : "/site/media/file/" + v.storageKey;
    }

    public Map<String, String> variantUrls(MediaAsset asset) {
        return variants.stream("asset", asset).collect(Collectors.toMap(
                v -> v.variantName, v -> "/site/media/file/" + v.storageKey, (a, b) -> a));
    }
}
```

- [ ] **Step 3: VariantWorker** — scheduled poller, same skeleton as AlertEvaluator:

```java
// VariantWorker.java
package com.feldnstein.platform.media;

import io.quarkus.runtime.LaunchMode;
import io.quarkus.scheduler.Scheduled;
import io.quarkus.hibernate.reactive.runtime.*;
import io.quarkus.narayana.jta.QuarkusTransaction;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

@ApplicationScoped
public class VariantWorker {

    @Inject MediaAssetRepository assets;
    @Inject MediaService mediaService;

    @Scheduled(every = "2s")
    void tick() {
        MediaAsset next = QuarkusTransaction.requiringNew()
                .call(() -> assets.find("status ?1 and finalized = true", MediaAsset.Status.DRAFT).firstResult());
        if (next != null) {
            Long id = next.id;
            try {
                QuarkusTransaction.requiringNew().run(() -> {
                    MediaAsset a = assets.findById(id);
                    if (a != null) mediaService.processOne(a);
                });
            } catch (Exception e) {
                QuarkusTransaction.requiringNew().run(() -> {
                    MediaAsset a = assets.findById(id);
                    if (a != null) mediaService.markError(a,
                            e.getMessage() == null ? "variant generation failed" : e.getMessage().substring(0, 300));
                });
            }
        }
        sweepOrphans();
    }

    /** Spec: uploads that were presigned but never finalized are swept after 24h. */
    void sweepOrphans() {
        QuarkusTransaction.requiringNew().run(() -> assets
                .find("status = com.feldnstein.platform.media.MediaAsset.Status.DRAFT and finalized = false and createdAt < ?1",
                        java.time.Instant.now().minusSeconds(86400))
                .forEach(a -> {
                    try { mediaService.delete(a.id); } catch (Exception ignored) { /* best effort */ }
                }));
    }
}
```

(Confirm the project's `Audited` interceptor package and JQL enum literal style — if enum literals fail on H2, match the AlertEvaluator's query idiom for status comparisons instead.)

Note: remove the accidental `io.quarkus.hibernate.reactive.runtime.*` and `LaunchMode` imports if unused — keep imports to `io.quarkus.scheduler.Scheduled`, `io.quarkus.narayana.jta.QuarkusTransaction`, `jakarta.enterprise.context.ApplicationScoped`, `jakarta.inject.Inject`.

- [ ] **Step 4: MediaResource** (admin endpoints + dev-upload + public file serving):

```java
// MediaResource.java
package com.feldnstein.platform.media;

import jakarta.annotation.security.PermitAll;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import java.io.InputStream;
import java.util.List;
import java.util.Map;

@Path("/")
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class MediaResource {

    @Inject MediaService mediaService;
    @Inject MediaAssetRepository assets;
    @Inject MediaStorage storage;

    private String user(SecurityContext ctx) { return ctx.getUserPrincipal() == null ? "unknown" : ctx.getUserPrincipal().getName(); }

    public record MetaRequest(String assetKey, String altText) {}

    @POST @Path("/g/media/presign") @RolesAllowed({"ADMIN", "OPERATOR"})
    public MediaService.PresignResponse presign(MediaService.PresignRequest req, @Context SecurityContext ctx) {
        return mediaService.presign(req, user(ctx));
    }

    /** Dev-storage upload receiver — the LocalDiskStorage presign points here. */
    @PUT @Path("/g/media/dev-upload/{storageKey:.+}") @RolesAllowed({"ADMIN", "OPERATOR"})
    @Consumes(MediaType.APPLICATION_OCTET_STREAM)
    @TransactionalHack
    public Response devUpload(@PathParam("storageKey") String storageKey, InputStream body,
                              @HeaderParam("Content-Type") String contentType) {
        try {
            mediaService.devUpload(storageKey, body.readAllBytes(), contentType);
            return Response.noContent().build();
        } catch (java.io.IOException e) {
            throw new BadRequestException("upload failed: " + e.getMessage());
        }
    }

    @POST @Path("/g/media/{id}/finalize") @RolesAllowed({"ADMIN", "OPERATOR"})
    public Response finalizeAsset(@PathParam("id") long id) {
        mediaService.finalizeAsset(id);
        return Response.ok(Map.of("status", "queued")).build();
    }

    @POST @Path("/g/media/{id}/retry") @RolesAllowed({"ADMIN", "OPERATOR"})
    public Response retry(@PathParam("id") long id) {
        mediaService.retry(id);
        return Response.ok(Map.of("status", "queued")).build();
    }

    @POST @Path("/g/media/{id}/publish") @RolesAllowed({"ADMIN", "OPERATOR"})
    @com.feldnstein.platform.gaanugu.Audited("MEDIA_PUBLISH")
    public Response publish(@PathParam("id") long id) {
        mediaService.setPublished(id, true);
        return Response.noContent().build();
    }

    @POST @Path("/g/media/{id}/unpublish") @RolesAllowed({"ADMIN", "OPERATOR"})
    public Response unpublish(@PathParam("id") long id) {
        mediaService.setPublished(id, false);
        return Response.noContent().build();
    }

    @PUT @Path("/g/media/{id}") @RolesAllowed({"ADMIN", "OPERATOR"})
    public Response updateMeta(@PathParam("id") long id, MetaRequest req) {
        mediaService.updateMeta(id, req.assetKey(), req.altText());
        return Response.noContent().build();
    }

    @DELETE @Path("/g/media/{id}") @RolesAllowed({"ADMIN", "OPERATOR"})
    @com.feldnstein.platform.gaanugu.Audited("MEDIA_DELETE")
    public Response delete(@PathParam("id") long id) {
        mediaService.delete(id);
        return Response.noContent().build();
    }

    @GET @Path("/g/media") @RolesAllowed({"ADMIN", "OPERATOR"})
    public List<Map<String, Object>> list() {
        return assets.listAll().stream().map(a -> Map.<String, Object>of(
                "id", a.id,
                "assetKey", a.assetKey,
                "originalFilename", a.originalFilename,
                "contentType", a.contentType,
                "sizeBytes", a.sizeBytes,
                "altText", a.altText == null ? "" : a.altText,
                "status", a.status.name(),
                "finalized", a.finalized,
                "errorNote", a.errorNote == null ? "" : a.errorNote,
                "variants", mediaService.variantUrls(a),
                "createdBy", a.createdBy == null ? "" : a.createdBy)).toList();
    }

    /** Public, cache-immutable media byte serving. */
    @GET @Path("/site/media/file/{key:.+}") @PermitAll
    @Produces({"image/jpeg", "image/png", "image/webp"})
    public Response file(@PathParam("key") String key) {
        byte[] bytes = storage.read(key); // throws IllegalStateException → 500; treat missing as 404
        var builder = Response.ok(bytes).header("Cache-Control", "public, max-age=86400, immutable");
        if (key.endsWith(".jpg")) builder = builder.type("image/jpeg");
        return builder.build();
    }
}
```

Fix before compiling: replace the bogus `@TransactionalHack` annotation on `devUpload` with `@jakarta.transaction.Transactional` (import `jakarta.transaction.Transactional`). Also wrap `storage.read` miss: catch `IllegalStateException` in `file()` and `throw new NotFoundException("media not found")`.

- [ ] **Step 5: Compile + smoke the flow manually**

Run compile (same mvn command). Then with dev backend up:

```bash
curl -s -u admin:admin123 -X POST http://localhost:8080/g/media/presign \
  -H 'Content-Type: application/json' \
  -d '{"assetKey":"test:demo:1","filename":"photo.jpg","contentType":"image/jpeg","sizeBytes":1000}'
# → {"assetId":...,"storageKey":"orig/...","uploadUrl":"/g/media/dev-upload/...","method":"PUT","headers":{"Content-Type":"image/jpeg"}}
```

Then generate a real tiny JPEG and PUT it, finalize, poll:

```bash
python3 - <<'EOF'
import base64, subprocess, json, time, urllib.request
jpeg = base64.b64decode('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/EH//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/EH//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/EH//2Q==')
req = urllib.request.Request('http://localhost:8080/g/media/presign',
    data=json.dumps({"assetKey":"test:demo:1","filename":"photo.jpg","contentType":"image/jpeg","sizeBytes":len(jpeg)}).encode(),
    headers={'Content-Type':'application/json'})
import base64 as b64
auth = b64.b64encode(b'admin:admin123').decode()
req.add_header('Authorization', 'Basic ' + auth)
info = json.load(urllib.request.urlopen(req))
up = urllib.request.Request('http://localhost:8080' + info['uploadUrl'], data=jpeg, method='PUT')
up.add_header('Authorization', 'Basic ' + auth); up.add_header('Content-Type', 'image/jpeg')
urllib.request.urlopen(up)
fin = urllib.request.Request(f"http://localhost:8080/g/media/{info['assetId']}/finalize", method='POST', data=b'')
fin.add_header('Authorization', 'Basic ' + auth); fin.add_header('Content-Type', 'application/json')
urllib.request.urlopen(fin)
for _ in range(15):
    time.sleep(2)
    g = urllib.request.Request('http://localhost:8080/g/media'); g.add_header('Authorization', 'Basic ' + auth)
    rows = json.load(urllib.request.urlopen(g))
    st = [r for r in rows if r['id'] == info['assetId']][0]
    print(st['status'], st['variants'])
    if st['status'] in ('READY','ERROR'): break
EOF
```
Expected: prints `READY {'card': '/site/media/file/var/.../card.jpg', ...}`.

- [ ] **Step 6: Commit**

```bash
git add platform-backend/src/main/java/com/feldnstein/platform/media/
git commit -m "media: presign/finalize/publish pipeline + variant worker + file serving"
```

---

### Task 6: Content blocks, product marketing, and public /site endpoints

**Files:**
- Create: `platform-backend/src/main/java/com/feldnstein/platform/media/ContentResource.java` (admin CRUD for blocks + marketing)
- Create: `platform-backend/src/main/java/com/feldnstein/platform/media/SiteResource.java` (public)

- [ ] **Step 1: ContentResource**

```java
// ContentResource.java
package com.feldnstein.platform.media;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import java.util.List;
import java.util.Map;

@Path("/g/site-content")
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed({"ADMIN", "OPERATOR"})
public class ContentResource {

    @Inject ContentBlockRepository blocks;
    @Inject ProductMarketingRepository marketing;
    @Inject ObjectMapper mapper;

    public record BlockRequest(String payload) {}

    /** payload must be valid JSON; blockKey 3..128 chars of a-z 0-9 : - . */
    @PUT @Path("/{key:.+}")
    @Transactional
    @com.feldnstein.platform.gaanugu.Audited("CONTENT_UPDATE")
    public Response putBlock(@PathParam("key") String key, BlockRequest req, @Context SecurityContext ctx) {
        if (!key.matches("[a-z0-9:.-]{3,128}")) throw new BadRequestException("invalid block key");
        try {
            mapper.readTree(req.payload());
        } catch (Exception e) {
            throw new BadRequestException("payload must be valid JSON: " + e.getMessage());
        }
        ContentBlock block = blocks.find("blockKey", key).firstResult();
        if (block == null) {
            block = new ContentBlock();
            block.blockKey = key;
            block.payload = req.payload();
            block.updatedBy = ctx.getUserPrincipal().getName();
            block.persist();
        } else {
            block.payload = req.payload();
            block.updatedBy = ctx.getUserPrincipal().getName();
        }
        return Response.noContent().build();
    }

    @GET @Path("/{key:.+}")
    public Map<String, Object> getBlock(@PathParam("key") String key) {
        ContentBlock block = blocks.find("blockKey", key).firstResult();
        if (block == null) throw new NotFoundException("block not found: " + key);
        try {
            return Map.of("blockKey", block.blockKey, "payload", mapper.readTree(block.payload),
                    "updatedBy", block.updatedBy == null ? "" : block.updatedBy, "updatedAt", block.updatedAt.toString());
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public record MarketingRequest(String badge, String shortDesc, String longDesc, Long cardAssetId) {}

    @PUT @Path("/product-marketing/{productId}")
    @Transactional
    @com.feldnstein.platform.gaanugu.Audited("CONTENT_UPDATE")
    public Response putMarketing(@PathParam("productId") long productId, MarketingRequest req) {
        ProductMarketing pm = marketing.find("product.id", productId).firstResult();
        if (pm == null) {
            pm = new ProductMarketing();
            pm.product = com.feldnstein.platform.gaanugu.OilProduct.findById(productId);
            if (pm.product == null) throw new NotFoundException("product not found");
            pm.persist();
        }
        pm.badge = req.badge();
        pm.shortDesc = req.shortDesc();
        pm.longDesc = req.longDesc();
        pm.cardAsset = req.cardAssetId() == null ? null : MediaAsset.findById(req.cardAssetId());
        if (req.cardAssetId() != null && pm.cardAsset == null) throw new NotFoundException("asset not found");
        return Response.noContent().build();
    }

    @GET @Path("/product-marketing")
    public List<ProductMarketing> listMarketing() {
        return marketing.listAll();
    }
}
```

Note: `ProductMarketing` has `@JsonIgnore` on `product` and `cardAsset` — for listMarketing to be useful, add two transient JSON fields instead. Add to `ProductMarketing`:

```java
@jakarta.persistence.Transient
public Long getProductId() { return product == null ? null : product.id; }
@jakarta.persistence.Transient
public Long getCardAssetId() { return cardAsset == null ? null : cardAsset.id; }
```

- [ ] **Step 2: SiteResource**

```java
// SiteResource.java
package com.feldnstein.platform.media;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.feldnstein.platform.gaanugu.OilProduct;
import com.feldnstein.platform.gaanugu.PriceConfig;
import com.feldnstein.platform.gaanugu.ProductVariant;
import jakarta.annotation.security.PermitAll;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.time.Instant;
import java.util.*;

@Path("/site")
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
@PermitAll
public class SiteResource {

    @Inject ContentBlockRepository blocks;
    @Inject ProductMarketingRepository marketing;
    @Inject MediaService mediaService;
    @Inject ObjectMapper mapper;

    private record CacheEntry(Object body, Instant expires) {}

    private volatile CacheEntry productsCache;
    private volatile CacheEntry contentCache;
    private static final long TTL_SECONDS = 60;

    @GET
    @Path("/products")
    public Response products() {
        CacheEntry cached = productsCache;
        if (cached != null && cached.expires().isAfter(Instant.now())) {
            return ok(cached.body());
        }
        List<Map<String, Object>> out = new ArrayList<>();
        for (OilProduct p : OilProduct.<OilProduct>list("active", true)) {
            Map<String, Object> pm = new LinkedHashMap<>();
            pm.put("id", p.id);
            pm.put("code", p.code);
            pm.put("name", p.name);
            pm.put("oilSource", p.oilSource.name());
            ProductMarketing mkt = marketing.find("product.id", p.id).firstResult();
            if (mkt != null) {
                pm.put("badge", mkt.badge);
                pm.put("shortDesc", mkt.shortDesc);
                pm.put("longDesc", mkt.longDesc);
                if (mkt.cardAsset != null && mkt.cardAsset.status == MediaAsset.Status.PUBLISHED) {
                    pm.put("imageUrl", mediaService.variantUrl(mkt.cardAsset, "card"));
                    pm.put("imageThumbUrl", mediaService.variantUrl(mkt.cardAsset, "thumb"));
                    pm.put("imageAlt", mkt.cardAsset.altText == null ? p.name : mkt.cardAsset.altText);
                }
            }
            List<Map<String, Object>> varOut = new ArrayList<>();
            for (ProductVariant v : ProductVariant.<ProductVariant>list("product", p)) {
                Map<String, Object> vm = new LinkedHashMap<>();
                vm.put("id", v.id);
                vm.put("sku", v.sku);
                vm.put("sizeMl", v.sizeMl);
                PriceConfig price = PriceConfig.<PriceConfig>find(
                        "variant ?1 and priceType ?2 and active", v, PriceConfig.PriceType.SELLING).firstResult();
                if (price != null) {
                    vm.put("price", price.amount);
                    vm.put("gstPct", price.gstPct);
                    vm.put("priceInclGst", price.amountInclGst());
                }
                varOut.add(vm);
            }
            pm.put("variants", varOut);
            out.add(pm);
        }
        productsCache = new CacheEntry(out, Instant.now().plusSeconds(TTL_SECONDS));
        return ok(out);
    }

    @GET
    @Path("/content")
    public Response content() {
        CacheEntry cached = contentCache;
        if (cached != null && cached.expires().isAfter(Instant.now())) {
            return ok(cached.body());
        }
        Map<String, JsonNode> out = new LinkedHashMap<>();
        for (ContentBlock b : blocks.listAll()) {
            try {
                out.put(b.blockKey, mapper.readTree(b.payload));
            } catch (Exception ignored) { /* skip malformed */ }
        }
        contentCache = new CacheEntry(out, Instant.now().plusSeconds(TTL_SECONDS));
        return ok(out);
    }

    /** Public metadata for one published asset (storefront image pickers, previews). */
    @GET
    @Path("/media/{assetKey:.+}")
    public Map<String, Object> media(@PathParam("assetKey") String assetKey) {
        MediaAsset a = MediaAsset.<MediaAsset>find("assetKey", assetKey).firstResult();
        if (a == null || a.status != MediaAsset.Status.PUBLISHED) throw new NotFoundException("media not found");
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("assetKey", a.assetKey);
        out.put("altText", a.altText == null ? "" : a.altText);
        out.put("variants", mediaService.variantUrls(a));
        return out;
    }

    private Response ok(Object body) {
        return Response.ok(body)
                .header("Cache-Control", "public, max-age=60, stale-while-revalidate=300")
                .build();
    }
}
```

Note: check the actual finder signatures in the codebase — `OilProduct.list("active", true)` and `ProductVariant.list("product", p)` follow Panache convention; if the project instead uses `listAll()` + stream filtering, match that idiom. `PriceConfig.amountInclGst()` exists (seen in exploration).

- [ ] **Step 3: Verify /site endpoints**

```bash
curl -s http://localhost:8080/site/products | head -c 400; echo
curl -s http://localhost:8080/site/content; echo
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/site/products   # 200 anon — no auth required
```
Expected: JSON arrays/maps; 200 without credentials.

- [ ] **Step 4: Commit**

```bash
git add platform-backend/src/main/java/com/feldnstein/platform/media/
git commit -m "media: content blocks, product marketing, public /site endpoints with cache"
```

---

### Task 7: E2E coverage for media + full suite

**Files:**
- Modify: `scripts/e2e-business-flows.py`

- [ ] **Step 1: Append a media test section at the end of the file** (follow the existing `check(name, cond)` helper and `base` variable conventions):

```python
# ---- 9. media & content management (spec 2026-10-30) ----
import base64, time
TINY_JPEG = base64.b64decode(
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/EH//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/EH//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/EH//2Q==')

def req(method, path, user=None, body=None, raw=False, headers=None):
    import urllib.request
    r = urllib.request.Request(base + path, method=method,
                               data=body if isinstance(body, (bytes, type(None))) else json.dumps(body).encode())
    r.add_header('Content-Type', 'application/json')
    if user:
        r.add_header('Authorization', 'Basic ' + base64.b64encode(f'{user}:'.encode() + PASSWORDS[user].encode()).decode())
    for k, v in (headers or {}).items():
        r.add_header(k, v)
    try:
        res = urllib.request.urlopen(r)
        return res.status, (res.read() if raw else json.loads(res.read() or b'null'))
    except urllib.error.HTTPError as e:
        return e.code, (e.read() if raw else None)

PASSWORDS = {'admin': 'admin123', 'ops': 'ops123', 'cust': 'cust123'}

# presign
code, info = req('POST', '/g/media/presign', 'admin',
                 {'assetKey': 'e2e:test:card', 'filename': 'photo.jpg', 'contentType': 'image/jpeg', 'sizeBytes': len(TINY_JPEG)})
check('9.1 presign', code == 200 and 'uploadUrl' in info)
asset_id = info['assetId']

# dev upload (uploadUrl is API-relative in disk mode)
up_url = info['uploadUrl'] if info['uploadUrl'].startswith('http') else base + info['uploadUrl']
code, _ = req('PUT', up_url[len(base):], 'admin', body=TINY_JPEG, headers={'Content-Type': 'image/jpeg'})
check('9.2 dev upload', code in (200, 204))

# finalize + worker
code, _ = req('POST', f'/g/media/{asset_id}/finalize', 'admin')
check('9.3 finalize', code == 200)
status = ''
for _ in range(15):
    time.sleep(2)
    code, rows = req('GET', '/g/media', 'admin')
    row = [r for r in rows if r['id'] == asset_id]
    if row:
        status = row[0]['status']
        variants = row[0]['variants']
    if status in ('READY', 'ERROR'):
        break
check('9.4 variants generated', status == 'READY' and 'card' in variants and 'hero' in variants)

# file serving (public)
code, img = req('GET', variants['card'], raw=True)
check('9.5 public file serving', code == 200 and img[:2] == b'\xff\xd8')

# publish gates /site/products image
code, _ = req('POST', f'/g/media/{asset_id}/publish', 'admin')
check('9.6 publish', code in (200, 204))
code, prods = req('GET', '/site/products')
check('9.7 anon site products', code == 200 and isinstance(prods, list))

# content block round trip
payload = json.dumps({'headline': 'E2E Hero', 'subcopy': 'from the test suite', 'imageUrl': variants['hero']})
code, _ = req('PUT', '/g/site-content/hero:main', 'admin', {'payload': payload})
check('9.8 content put', code in (200, 204))
code, block = req('GET', '/g/site-content/hero:main', 'admin')
check('9.9 content get', code == 200 and block['payload']['headline'] == 'E2E Hero')
code, content = req('GET', '/site/content')
check('9.10 anon site content', code == 200 and content['hero:main']['headline'] == 'E2E Hero')

# RBAC
code, _ = req('GET', '/g/media', 'cust')
check('9.11 cust blocked from media admin', code == 403)
code, _ = req('GET', '/g/site-content/hero:main', None)
check('9.12 anon blocked from content admin', code == 401)

# cleanup: unpublish + delete
req('POST', f'/g/media/{asset_id}/unpublish', 'admin')
code, _ = req('DELETE', f'/g/media/{asset_id}', 'admin')
check('9.13 delete asset', code in (200, 204))
```

Adjust `check`/`base` references to match the actual helper names in `scripts/e2e-business-flows.py` (read the top of the file first; reuse its request/auth utilities instead of the local `req` above where they fit). Fix the `asset_id` extraction line to simply `asset_id = info['assetId']`.

- [ ] **Step 2: Run the full suite** — `python3 scripts/e2e-business-flows.py` → Expected: all sections pass, including the new 9.x block (13 new assertions).

- [ ] **Step 3: Commit**

```bash
git add scripts/e2e-business-flows.py
git commit -m "e2e: media pipeline, content blocks, site endpoints, RBAC"
```

---

### Task 8: Admin UI — Media Library

**Files:**
- Create: `platform-admin/src/gaanugu-media.tsx`
- Modify: `platform-admin/src/App.tsx` (nav registration)

- [ ] **Step 1: Write gaanugu-media.tsx**

```tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'
import { Button, Field, LoadingRows, Modal, Pill, useToast, type PillTone } from './ui'

/* ---- media domain types ---- */
export interface GMediaAsset {
  id: number
  assetKey: string
  originalFilename: string
  contentType: string
  sizeBytes: number
  altText: string
  status: 'DRAFT' | 'PROCESSING' | 'READY' | 'PUBLISHED' | 'ERROR'
  finalized: boolean
  errorNote: string
  variants: Record<string, string>
  createdBy: string
}

const STATUS_TONE: Record<string, PillTone> = {
  DRAFT: 'slate', PROCESSING: 'gold', READY: 'forest', PUBLISHED: 'green', ERROR: 'rust',
}

const SLOT_HINTS = ['product:groundnut:card', 'product:sesame:card', 'hero:main', 'banner:main', 'misc:']

export function GMedia() {
  const [assets, setAssets] = useState<GMediaAsset[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [watch, setWatch] = useState(0)
  const toast = useToast()

  const load = useCallback(() => {
    setError(null)
    api.list<GMediaAsset>('/g/media')
      .then(setAssets)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])
  useEffect(() => { load(); const t = setInterval(load, 4000); return () => clearInterval(t) }, [load, watch])

  const togglePublish = async (a: GMediaAsset) => {
    try {
      await api.post(a.status === 'PUBLISHED' ? `/g/media/${a.id}/unpublish` : `/g/media/${a.id}/publish`)
      toast('success', a.status === 'PUBLISHED' ? 'Unpublished' : 'Published')
      load()
    } catch (e) { toast('error', e instanceof Error ? e.message : String(e)) }
  }
  const remove = async (a: GMediaAsset) => {
    if (!window.confirm(`Delete ${a.assetKey}? This removes the stored files.`)) return
    try {
      await api.post(`/g/media/${a.id}/unpublish`).catch(() => undefined)
      const res = await fetch(`${API_BASE}/g/media/${a.id}`, {
        method: 'DELETE',
        headers: { Authorization: api.getAuth() ?? '' },
      })
      if (!res.ok) throw new Error(`delete failed (${res.status})`)
      toast('success', 'Asset deleted')
      load()
    } catch (e) { toast('error', e instanceof Error ? e.message : String(e)) }
  }

  return (
    <section>
      <div className="toolbar">
        <Pill tone="forest">{assets?.length ?? 0} assets</Pill>
        <div className="spacer" />
        <Button variant="ghost" small onClick={load}>Refresh</Button>
        <Button variant="gold" small onClick={() => setOpen(true)}>+ Upload</Button>
      </div>
      {error && <p style={{ color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>{error}</p>}
      {!assets && !error && <LoadingRows cols={4} />}
      {assets && assets.length === 0 && (
        <div className="card" style={{ padding: 24, color: 'var(--muted)' }}>No media yet — upload the first asset.</div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {assets?.map((a) => (
          <div key={a.id} className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {a.variants.thumb
              ? <img src={a.variants.thumb} alt={a.altText || a.assetKey} style={{ width: '100%', borderRadius: 6, aspectRatio: '4/5', objectFit: 'cover' }} />
              : <div style={{ aspectRatio: '4/5', borderRadius: 6, background: 'var(--cream)', display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: 12 }}>no preview</div>}
            <div style={{ fontSize: 12, fontWeight: 700 }}>{a.assetKey}</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <Pill tone={STATUS_TONE[a.status] ?? 'plain'}>{a.status}</Pill>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{(a.sizeBytes / 1024).toFixed(0)} KB</span>
            </div>
            {a.errorNote && <div style={{ fontSize: 11, color: 'var(--rust)' }}>{a.errorNote}</div>}
            <div style={{ display: 'flex', gap: 6 }}>
              {(a.status === 'READY' || a.status === 'PUBLISHED') && (
                <Button variant="ghost" small onClick={() => togglePublish(a)}>{a.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}</Button>
              )}
              {a.status === 'ERROR' && (
                <Button variant="ghost" small onClick={async () => { await api.post(`/g/media/${a.id}/retry`); setWatch((w) => w + 1) }}>Retry</Button>
              )}
              <Button variant="ghost" small onClick={() => remove(a)}>Delete</Button>
            </div>
          </div>
        ))}
      </div>
      <UploadModal open={open} onClose={() => setOpen(false)} onDone={() => { setOpen(false); setWatch((w) => w + 1) }} />
    </section>
  )
}

const API_BASE: string = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

function UploadModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [assetKey, setAssetKey] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState('')
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  const valid = assetKey.trim().length >= 3 && !!file

  const submit = async () => {
    if (!file) return
    setBusy(true); setError(null); setPhase('Requesting upload…')
    try {
      const presigned = await api.create<{ assetId: number; uploadUrl: string; method: string; headers: Record<string, string> }>(
        '/g/media/presign', {
          assetKey: assetKey.trim(), filename: file.name, contentType: file.type, sizeBytes: file.size,
        })
      setPhase('Uploading…')
      const url = presigned.uploadUrl.startsWith('http') ? presigned.uploadUrl : API_BASE + presigned.uploadUrl
      const res = await fetch(url, { method: presigned.method, headers: { ...presigned.headers, Authorization: api.getAuth() ?? '' }, body: file })
      if (!res.ok) throw new Error(`Upload failed (${res.status})`)
      setPhase('Processing variants…')
      await api.post(`/g/media/${presigned.assetId}/finalize`)
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 2000))
        const rows = await api.list<GMediaAsset>('/g/media')
        const row = rows.find((r) => r.id === presigned.assetId)
        if (row?.status === 'READY') break
        if (row?.status === 'ERROR') throw new Error(row.errorNote || 'variant generation failed')
      }
      toast('success', 'Uploaded — variants ready')
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally { setBusy(false); setPhase('') }
  }

  return (
    <Modal title="Upload media" sub="Auto-cropped to card 4:5, hero 16:9, banner 21:9, thumb 4:5. JPEG, PNG, or WebP up to 10 MB." open={open} onClose={onClose}>
      <Field label="Asset key (slot)">
        <input className="input" style={{ width: '100%' }} value={assetKey} onChange={(e) => setAssetKey(e.target.value)}
          placeholder="product:groundnut:card" list="slot-hints" autoFocus />
        <datalist id="slot-hints">{SLOT_HINTS.map((s) => <option key={s} value={s} />)}</datalist>
      </Field>
      <Field label="Image file">
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="input" style={{ width: '100%' }}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </Field>
      {phase && <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>{phase}</p>}
      {error && <p style={{ color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>{error}</p>}
      <div className="modal-actions">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="gold" disabled={!valid || busy} onClick={submit}>{busy ? 'Working…' : 'Upload'}</Button>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 2: Register in App.tsx nav** — add to imports and insert this group into `NAV` after the 'Audit' group:

```tsx
import { GMedia } from './gaanugu-media'
```
```tsx
{
  section: 'Media', icon: '🖼️',
  items: [
    N('g-media', 'Media Library', GMedia,
      <>Media <em>library</em></>,
      'Upload photos — auto-cropped to card, hero, banner, and thumb specs.'),
  ],
},
```

- [ ] **Step 3: Typecheck + build**

Run: `cd platform-admin && npx tsc --noEmit && npm run build`
Expected: no errors; vite build succeeds.

- [ ] **Step 4: Commit**

```bash
git add platform-admin/src/gaanugu-media.tsx platform-admin/src/App.tsx
git commit -m "admin: media library — upload, variant preview, publish/unpublish, delete"
```

---

### Task 9: Admin UI — Site Content editors

**Files:**
- Create: `platform-admin/src/gaanugu-content.tsx`
- Modify: `platform-admin/src/App.tsx`

- [ ] **Step 1: Write gaanugu-content.tsx**

```tsx
import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import { gaanugu, type GOilProduct, type GVariant, type GPriceConfig } from './gaanugu-api'
import { Button, Field, LoadingRows, Pill, useToast } from './ui'

/* ================= SITE CONTENT ================= */
const TABS = ['Hero', 'Banner', 'Testimonials', 'Ticker', 'Products'] as const

export function GSiteContent() {
  const [sub, setSub] = useState<(typeof TABS)[number]>('Hero')
  return (
    <section>
      <div className="toolbar">
        <div className="filter-row">
          {TABS.map((t) => (
            <Pill key={t} tone={sub === t ? 'forest' : 'plain'} selected={sub === t} onClick={() => setSub(t)}>{t}</Pill>
          ))}
        </div>
      </div>
      {sub === 'Hero' && <HeroEditor />}
      {sub === 'Banner' && <BannerEditor />}
      {sub === 'Testimonials' && <TestimonialsEditor />}
      {sub === 'Ticker' && <TickerEditor />}
      {sub === 'Products' && <ProductsEditor />}
    </section>
  )
}

/* ---- shared: load/save a JSON content block ---- */
function useBlock(key: string) {
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()
  const load = useCallback(() => {
    setLoading(true); setError(null)
    api.get<{ payload: Record<string, unknown> }>(`/g/site-content/${encodeURIComponent(key)}`)
      .then((b) => setPayload(b.payload ?? {}))
      .catch(() => setPayload({}))
      .finally(() => setLoading(false))
  }, [key])
  useEffect(load, [load])
  const save = async (next: Record<string, unknown>) => {
    try {
      await api.update(`/g/site-content/${encodeURIComponent(key)}`, { payload: JSON.stringify(next) })
      toast('success', 'Saved')
      setPayload(next)
    } catch (e) { toast('error', e instanceof Error ? e.message : String(e)) }
  }
  return { payload, loading, error, save, reload: load }
}

function BlockCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: 16, maxWidth: 860, marginBottom: 22 }}>
      <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  )
}

/* ---- asset picker: choose a PUBLISHED asset, store its variant URL ---- */
function usePublishedAssets() {
  const [assets, setAssets] = useState<{ assetKey: string; variants: Record<string, string> }[]>([])
  useEffect(() => {
    api.list<{ assetKey: string; status: string; variants: Record<string, string> }>('/g/media')
      .then((rows) => setAssets(rows.filter((r) => r.status === 'PUBLISHED')))
      .catch(() => undefined)
  }, [])
  return assets
}

function AssetPicker({ label, value, onChange, variant = 'hero' }: {
  label: string; value: string; onChange: (url: string, assetKey: string) => void; variant?: string
}) {
  const assets = usePublishedAssets()
  return (
    <Field label={label}>
      <select className="input" style={{ width: '100%' }}
        value={assets.find((a) => a.variants[variant] === value)?.assetKey ?? ''}
        onChange={(e) => {
          const a = assets.find((x) => x.assetKey === e.target.value)
          if (a) onChange(a.variants[variant] ?? '', a.assetKey)
        }}>
        <option value="">— none —</option>
        {assets.map((a) => <option key={a.assetKey} value={a.assetKey}>{a.assetKey}</option>)}
      </select>
    </Field>
  )
}

function HeroEditor() {
  const { payload, loading, save } = useBlock('hero:main')
  const [form, setForm] = useState({ headline: '', subcopy: '', imageUrl: '' })
  useEffect(() => { if (payload) setForm({
    headline: String(payload.headline ?? ''), subcopy: String(payload.subcopy ?? ''), imageUrl: String(payload.imageUrl ?? ''),
  }) }, [payload])
  if (loading || !payload) return <LoadingRows cols={3} />
  return (
    <BlockCard title="Homepage hero">
      <AssetPicker label="Hero image (16:9)" value={form.imageUrl}
        onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))} variant="hero" />
      {form.imageUrl && <img src={form.imageUrl} alt="hero preview" style={{ width: '100%', maxWidth: 480, borderRadius: 6, marginBottom: 12 }} />}
      <Field label="Headline"><input className="input" style={{ width: '100%' }} value={form.headline} onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))} /></Field>
      <Field label="Subcopy"><input className="input" style={{ width: '100%' }} value={form.subcopy} onChange={(e) => setForm((f) => ({ ...f, subcopy: e.target.value }))} /></Field>
      <Button variant="gold" disabled={!form.headline} onClick={() => save({ ...form })}>Save hero</Button>
    </BlockCard>
  )
}

function BannerEditor() {
  const { payload, loading, save } = useBlock('banner:main')
  const [form, setForm] = useState({ heading: '', imageUrl: '', link: '' })
  useEffect(() => { if (payload) setForm({
    heading: String(payload.heading ?? ''), imageUrl: String(payload.imageUrl ?? ''), link: String(payload.link ?? ''),
  }) }, [payload])
  if (loading || !payload) return <LoadingRows cols={3} />
  return (
    <BlockCard title="Collection banner (21:9)">
      <AssetPicker label="Banner image" value={form.imageUrl}
        onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))} variant="banner" />
      <Field label="Heading"><input className="input" style={{ width: '100%' }} value={form.heading} onChange={(e) => setForm((f) => ({ ...f, heading: e.target.value }))} /></Field>
      <Field label="Link (optional)"><input className="input" style={{ width: '100%' }} value={form.link} onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} placeholder="/#collection" /></Field>
      <Button variant="gold" disabled={!form.heading} onClick={() => save({ ...form })}>Save banner</Button>
    </BlockCard>
  )
}

interface TestimonialItem { quote: string; author: string; location: string }

function TestimonialsEditor() {
  const { payload, loading, save } = useBlock('testimonials')
  const [items, setItems] = useState<TestimonialItem[]>([])
  useEffect(() => { if (payload) setItems((payload.items as TestimonialItem[]) ?? []) }, [payload])
  if (loading || !payload) return <LoadingRows cols={3} />
  const set = (i: number, patch: Partial<TestimonialItem>) =>
    setItems((arr) => arr.map((it, j) => (j === i ? { ...it, ...patch } : it)))
  return (
    <BlockCard title="Testimonials">
      {items.map((it, i) => (
        <div key={i} style={{ border: '1px solid var(--hairline)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <Field label="Quote"><input className="input" style={{ width: '100%' }} value={it.quote} onChange={(e) => set(i, { quote: e.target.value })} /></Field>
          <div style={{ display: 'flex', gap: 12 }}>
            <Field label="Author"><input className="input" value={it.author} onChange={(e) => set(i, { author: e.target.value })} /></Field>
            <Field label="Location"><input className="input" value={it.location} onChange={(e) => set(i, { location: e.target.value })} /></Field>
          </div>
          <Button variant="ghost" small onClick={() => setItems((arr) => arr.filter((_, j) => j !== i))}>Remove</Button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="ghost" small onClick={() => setItems((arr) => [...arr, { quote: '', author: '', location: '' }])}>+ Add testimonial</Button>
        <Button variant="gold" disabled={items.some((i) => !i.quote || !i.author)} onClick={() => save({ items })}>Save testimonials</Button>
      </div>
    </BlockCard>
  )
}

function TickerEditor() {
  const { payload, loading, save } = useBlock('ticker:items')
  const [items, setItems] = useState<string[]>([])
  useEffect(() => { if (payload) setItems((payload.items as string[]) ?? []) }, [payload])
  if (loading || !payload) return <LoadingRows cols={2} />
  return (
    <BlockCard title="Ticker headlines">
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input className="input" style={{ flex: 1 }} value={it} onChange={(e) => setItems((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))} />
          <Button variant="ghost" small onClick={() => setItems((arr) => arr.filter((_, j) => j !== i))}>✕</Button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="ghost" small onClick={() => setItems((arr) => [...arr, '']}>+ Add line</Button>
        <Button variant="gold" disabled={items.some((i) => !i.trim())} onClick={() => save({ items })}>Save ticker</Button>
      </div>
    </BlockCard>
  )
}

/* ---- products: marketing fields per oil ---- */
interface Mkt { badge: string; shortDesc: string; longDesc: string; cardAssetId: number | null }

function ProductsEditor() {
  const products = useCallback(() => gaanugu.list<GOilProduct>('/oil-products?size=500'), [])
  const [prods, setProds] = useState<GOilProduct[] | null>(null)
  const [mkt, setMkt] = useState<Record<number, Mkt>>({})
  const [assets, setAssets] = useState<{ id: number; assetKey: string; status: string; variants: Record<string, string> }[]>([])
  const toast = useToast()
  useEffect(() => {
    products().then(setProds).catch(() => undefined)
    api.list<{ id: number; assetKey: string; status: string; variants: Record<string, string> }>('/g/media')
      .then((rows) => setAssets(rows)).catch(() => undefined)
    api.list<{ productId: number; badge?: string; shortDesc?: string; longDesc?: string; cardAssetId?: number }>('/g/site-content/product-marketing')
      .then((rows) => setMkt(Object.fromEntries(rows.map((r) => [r.productId, {
        badge: r.badge ?? '', shortDesc: r.shortDesc ?? '', longDesc: r.longDesc ?? '', cardAssetId: r.cardAssetId ?? null,
      }]))))
      .catch(() => undefined)
  }, [])
  const save = async (p: GOilProduct) => {
    const f = mkt[p.id] ?? { badge: '', shortDesc: '', longDesc: '', cardAssetId: null }
    try {
      await api.update(`/g/site-content/product-marketing/${p.id}`, {
        badge: f.badge || null, shortDesc: f.shortDesc || null, longDesc: f.longDesc || null, cardAssetId: f.cardAssetId,
      })
      toast('success', `${p.name} marketing saved`)
    } catch (e) { toast('error', e instanceof Error ? e.message : String(e)) }
  }
  if (!prods) return <LoadingRows cols={4} />
  const cardAssets = assets.filter((a) => a.status === 'PUBLISHED')
  return (
    <>
      {prods.filter((p) => p.active).map((p) => {
        const f = mkt[p.id] ?? { badge: '', shortDesc: '', longDesc: '', cardAssetId: null }
        const set = (patch: Partial<Mkt>) => setMkt((m) => ({ ...m, [p.id]: { ...f, ...patch } }))
        const chosen = cardAssets.find((a) => a.id === f.cardAssetId)
        return (
          <BlockCard key={p.id} title={p.name}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ width: 160 }}>
                {chosen?.variants.thumb
                  ? <img src={chosen.variants.thumb} alt={p.name} style={{ width: '100%', borderRadius: 6, aspectRatio: '4/5', objectFit: 'cover' }} />
                  : <div style={{ aspectRatio: '4/5', borderRadius: 6, background: 'var(--cream)', display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: 11, textAlign: 'center', padding: 8 }}>no card image — storefront uses its default</div>}
              </div>
              <div style={{ flex: 1, minWidth: 280 }}>
                <Field label="Card image (4:5)">
                  <select className="input" style={{ width: '100%' }} value={f.cardAssetId ?? ''} onChange={(e) => set({ cardAssetId: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">— none —</option>
                    {cardAssets.map((a) => <option key={a.id} value={a.id}>{a.assetKey}</option>)}
                  </select>
                </Field>
                <Field label="Badge"><input className="input" style={{ width: '100%' }} value={f.badge} onChange={(e) => set({ badge: e.target.value })} placeholder="Single-Origin Harvest" /></Field>
                <Field label="Short description"><input className="input" style={{ width: '100%' }} value={f.shortDesc} onChange={(e) => set({ shortDesc: e.target.value })} /></Field>
                <Field label="Long description"><textarea className="input" style={{ width: '100%', minHeight: 80 }} value={f.longDesc} onChange={(e) => set({ longDesc: e.target.value })} /></Field>
                <Button variant="gold" onClick={() => save(p)}>Save</Button>
              </div>
            </div>
          </BlockCard>
        )
      })}
    </>
  )
}
```

- [ ] **Step 2: Register in App.tsx** — add `import { GSiteContent } from './gaanugu-content'` and a second item in the Media nav group:

```tsx
N('g-site-content', 'Site Content', GSiteContent,
  <>Site <em>content</em></>,
  'Hero, banners, testimonials, ticker, and per-oil descriptions that power the storefront.'),
```

- [ ] **Step 3: Typecheck + build** (`cd platform-admin && npx tsc --noEmit && npm run build`). Expected: green.

- [ ] **Step 4: Commit**

```bash
git add platform-admin/src/gaanugu-content.tsx platform-admin/src/App.tsx
git commit -m "admin: site content editors — hero, banner, testimonials, ticker, product marketing"
```

---

### Task 10: Storefront — ContentContext with fallback

**Files:**
- Create: `feldnstein-react/src/context/ContentContext.jsx`
- Modify: `feldnstein-react/src/main.jsx` (wrap App)

- [ ] **Step 1: Write ContentContext.jsx**

```jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { products as defaultProducts, categories as defaultCategories } from '../data/products'

const API_BASE = import.meta.env.VITE_SITE_API ?? ''
const ContentCtx = createContext(null)

async function fetchJson(path, timeoutMs = 5000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(API_BASE + path, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`site api ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(t)
  }
}

/** Normalize the platform /site/products payload into the storefront product shape. */
function normalizeProducts(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return defaultProducts
  return rows.map((p) => {
    const fallback = defaultProducts.find((d) => d.id === String(p.code ?? '').toLowerCase() || d.name.includes(p.name?.split(' ')[2] ?? ''))
    const sizes = (p.variants ?? []).map((v) => ({
      sku: v.sku, sizeMl: v.sizeMl,
      price: v.price != null ? Number(v.price) : undefined,
      priceInclGst: v.priceInclGst != null ? Number(v.priceInclGst) : undefined,
    }))
    const minPrice = sizes.length ? Math.min(...sizes.map((s) => s.priceInclGst ?? s.price ?? Infinity)) : (fallback?.price ?? 0)
    return {
      id: fallback?.id ?? String(p.code ?? p.id).toLowerCase(),
      name: p.name ?? fallback?.name ?? 'Oil',
      price: minPrice === Infinity ? 0 : minPrice,
      priceRange: sizes.length > 1 ? `₹${Math.round(minPrice)} – ₹${Math.round(Math.max(...sizes.map((s) => s.priceInclGst ?? s.price ?? minPrice)))}` : null,
      category: fallback?.category ?? 'staples',
      img: p.imageUrl ?? fallback?.img ?? '/assets/img/img-02.jpg',
      badge: p.badge ?? fallback?.badge ?? '',
      desc: p.shortDesc ?? fallback?.desc ?? '',
      longDesc: p.longDesc ?? fallback?.longDesc ?? undefined,
      sizes,
    }
  })
}

export function ContentProvider({ children }) {
  const [state, setState] = useState({
    products: defaultProducts,
    categories: defaultCategories,
    hero: null,
    banner: null,
    testimonials: null,
    ticker: null,
    live: false,
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [products, content] = await Promise.all([
          fetchJson('/site/products'),
          fetchJson('/site/content'),
        ])
        if (cancelled) return
        setState({
          products: normalizeProducts(products),
          categories: defaultCategories,
          hero: content['hero:main'] ?? null,
          banner: content['banner:main'] ?? null,
          testimonials: content['testimonials']?.items ?? null,
          ticker: content['ticker:items']?.items ?? null,
          live: true,
        })
      } catch {
        if (!cancelled) setState((s) => ({ ...s, live: false }))
      }
    })()
    return () => { cancelled = true }
  }, [])

  return <ContentCtx.Provider value={state}>{children}</ContentCtx.Provider>
}

export function useContent() {
  return useContext(ContentCtx)
}
```

- [ ] **Step 2: Wire into main.jsx** — wrap `<App />`:

```jsx
import { ContentProvider } from './context/ContentContext.jsx'
// ...
<ContentProvider>
  <App />
</ContentProvider>
```

(match the actual mounting idiom in `feldnstein-react/src/main.jsx` — keep its existing StrictCart/other wrappers and add ContentProvider as the outermost wrapper.)

- [ ] **Step 3: Verify the build** — `cd feldnstein-react && npm run build`. Expected: build succeeds (no component uses the context yet; fallback data still renders).

- [ ] **Step 4: Commit**

```bash
git add feldnstein-react/src/context/ContentContext.jsx feldnstein-react/src/main.jsx
git commit -m "storefront: content context — live site API with static fallback"
```

---

### Task 11: Storefront — wire components to live content

**Files:**
- Modify: `feldnstein-react/src/components/CollectionSection.jsx`
- Modify: `feldnstein-react/src/components/Hero.jsx`
- Modify: `feldnstein-react/src/components/Ticker.jsx`
- Modify: `feldnstein-react/src/components/TestimonialsSection.jsx`

For each component: read it first, then apply the pattern below to its specific variable names — replace the hardcoded source with `useContent()` values, keeping the static value as the fallback. The exact integration points:

- [ ] **Step 1: CollectionSection.jsx** — replace `import { products, categories } from '../data/products'` with:

```jsx
import { useContent } from '../context/ContentContext'
// inside the component:
const { products, categories } = useContent()
```
Everything downstream (`products.map(...)`) works unchanged because `normalizeProducts` returns the same shape plus optional `longDesc`.

- [ ] **Step 2: Hero.jsx** — add `const { hero } = useContent()`; use `hero?.imageUrl` as the hero background/image source when present (fallback to the current hardcoded asset path), `hero?.headline` for the headline text, `hero?.subcopy` for the subheading. Keep all existing animation/scroll behavior untouched.

- [ ] **Step 3: Ticker.jsx** — add `const { ticker } = useContent()`; render `ticker` array items when present, else the current hardcoded lines. (The component likely duplicates its line list for a seamless marquee loop — feed both loops from the same resolved array.)

- [ ] **Step 4: TestimonialsSection.jsx** — add `const { testimonials } = useContent()`; map over `testimonials` (`{quote, author, location}`) when present, else the current hardcoded quotes.

- [ ] **Step 5: QuickViewModal** (only if it reads product fields beyond the shared shape) — add `longDesc` support: prefer `product.longDesc ?? product.desc` for the detail body.

- [ ] **Step 6: Verify build + smoke** — `cd feldnstein-react && npm run build && node smoke-test.mjs`. Expected: build green, smoke passes (it renders against the static fallback since no API is configured locally).

- [ ] **Step 7: Commit**

```bash
git add feldnstein-react/src/components/
git commit -m "storefront: hero, ticker, testimonials, collection read live content with fallback"
```

---

### Task 12: Deploy — storefront to Pages root, admin to /admin/

**Files:**
- Modify: `.github/workflows/deploy.yml`
- Modify: `feldnstein-react/vite.config.js`
- Modify: `docs/client-success/demo-runbook.md` and `docs/client-success/role-page-matrix.md` (URLs)

Context: the Pages project site is served under `/<repo>/` (`https://shivaram19.github.io/feldnstein-premium-store/`). The admin build already receives `VITE_BASE` — check `platform-admin/vite.config.ts` and confirm it sets `base: process.env.VITE_BASE`; if not, add it. Admin will live at `/<repo>/admin/`, storefront at `/<repo>/`.

- [ ] **Step 1: storefront base** — `feldnstein-react/vite.config.js`:

```js
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? '/',
})
```

- [ ] **Step 2: admin base** — in `platform-admin/vite.config.ts` ensure:

```ts
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  // ...existing config
})
```

- [ ] **Step 3: restructure the workflow frontend job** — replace the `Build SPA` + `upload-pages-artifact` steps with:

```yaml
      - name: Build storefront (Pages root)
        working-directory: feldnstein-react
        env:
          VITE_SITE_API: ${{ vars.VITE_API_BASE }}
          VITE_BASE: /${{ github.event.repository.name }}/
        run: |
          npm ci
          npm run build

      - name: Build admin SPA (under /admin/)
        working-directory: platform-admin
        env:
          VITE_API_BASE: ${{ vars.VITE_API_BASE }}
          VITE_BASE: /${{ github.event.repository.name }}/admin/
        run: |
          npm ci
          npm run build

      - name: Merge artifacts
        run: |
          mkdir -p _site
          cp -r feldnstein-react/dist/* _site/
          mkdir -p _site/admin
          cp -r platform-admin/dist/* _site/admin/

      - uses: actions/configure-pages@v5

      - uses: actions/upload-pages-artifact@v3
        with:
          path: _site

      - id: deploy
        uses: actions/deploy-pages@v4
```

Also update the `cache-dependency-path` to cover both lockfiles:

```yaml
          cache-dependency-path: |
            platform-admin/package-lock.json
            feldnstein-react/package-lock.json
```

- [ ] **Step 4: update the docs URLs** — in both client-success docs replace the live URLs:
- storefront: `https://shivaram19.github.io/feldnstein-premium-store/`
- admin: `https://shivaram19.github.io/feldnstein-premium-store/admin/`
(Primary demo remains local — these are the backup URLs.)

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/deploy.yml feldnstein-react/vite.config.js platform-admin/vite.config.ts docs/client-success/
git commit -m "deploy: storefront at Pages root, admin at /admin/"
```

---

### Task 13: Render env vars + final end-to-end verification

**Files:**
- Modify: `render.yaml` (add env var entries with empty values as documentation)

- [ ] **Step 1: document R2 env vars in render.yaml** — add to the backend service `envVars`:

```yaml
        - key: MEDIA_STORAGE_TYPE
          value: s3
        - key: MEDIA_S3_ENDPOINT
          sync: false
        - key: MEDIA_S3_BUCKET
          sync: false
        - key: MEDIA_S3_ACCESS_KEY
          sync: false
        - key: MEDIA_S3_SECRET_KEY
          sync: false
```
(`sync: false` marks them as secret-set-in-dashboard, matching how the database URL is handled.) The actual values are entered in the Render dashboard once an R2 bucket exists — note this in the runbook contingency table.

- [ ] **Step 2: full verification sweep**

```bash
JAVA_HOME=$PWD/.tools/jdk-21 .tools/apache-maven-3.9.9/bin/mvn -q -f platform-backend/pom.xml compile
cd platform-admin && npx tsc --noEmit && npm run build && cd ..
cd feldnstein-react && npm run build && node smoke-test.mjs && cd ..
python3 scripts/e2e-business-flows.py
```
Expected: compile green; both SPAs build; smoke passes; **E2E all sections green including 9.x media**.

- [ ] **Step 3: Push both branches**

```bash
git push origin HEAD:main && git push origin HEAD:premium-redesign
```

- [ ] **Step 4: live verification after Render rebuild (~10 min)** — poll then check:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://feldnstein-platform-backend.onrender.com/site/products   # 200
curl -s -o /dev/null -w '%{http_code}\n' https://shivaram19.github.io/feldnstein-premium-store/           # 200 storefront
curl -s -o /dev/null -w '%{http_code}\n' https://shivaram19.github.io/feldnstein-premium-store/admin/     # 200 admin
```

Note: media upload on the live backend returns "media storage not configured" (503-style message) until R2 credentials are entered in the Render dashboard — everything else works.
