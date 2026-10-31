package com.feldnstein.platform.media;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Instance;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.ServiceUnavailableException;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import java.util.Map;
import java.util.stream.Collectors;

@ApplicationScoped
public class MediaService {

    // Instance.get() resolves through the @LookupIfProperty conditions on the impls,
    // which only apply to programmatic lookup, not plain @Inject resolution.
    @Inject Instance<MediaStorage> storageLookup;
    @Inject MediaAssetRepository assets;
    @Inject MediaVariantRepository variants;
    @Inject MediaStorageConfig mediaConfig;
    @ConfigProperty(name = "media.upload.max-bytes", defaultValue = "10485760")
    long maxBytes;

    private MediaStorage storage() { return storageLookup.get(); }

    public record PresignRequest(String assetKey, String filename, String contentType, long sizeBytes) {}
    public record PresignResponse(long assetId, String storageKey, String uploadUrl, String method,
                                  Map<String, String> headers) {}

    @Transactional
    public PresignResponse presign(PresignRequest req, String user) {
        if (!mediaConfig.storageUsable()) throw new ServiceUnavailableException("media storage not configured");
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
        asset.storageKey = "orig/" + asset.id + "-" + slug;
        MediaStorage.UploadTarget target = storage().presignPut(asset.storageKey, ct, req.sizeBytes());
        return new PresignResponse(asset.id, asset.storageKey, target.uploadUrl(), target.method(), target.headers());
    }

    /** Local-disk profile only: receive the raw bytes the browser would have PUT to S3. */
    @Transactional
    public void devUpload(String storageKey, byte[] bytes, String contentType) {
        if (!mediaConfig.storageUsable()) throw new ServiceUnavailableException("media storage not configured");
        storage().write(storageKey, new java.io.ByteArrayInputStream(bytes), bytes.length, contentType);
    }

    /** Verify the uploaded object (size + magic bytes), then queue variant generation. */
    @Transactional(dontRollbackOn = IllegalArgumentException.class)
    public void finalizeAsset(long id) {
        if (!mediaConfig.storageUsable()) throw new ServiceUnavailableException("media storage not configured");
        MediaAsset asset = assets.findById(id);
        if (asset == null) throw new NotFoundException("asset not found");
        byte[] bytes = storage().read(asset.storageKey);
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
        storage().delete(asset.storageKey);
    }

    /** Called by VariantWorker inside its own transaction. */
    @Transactional
    public void processOne(MediaAsset asset) {
        asset.status = MediaAsset.Status.PROCESSING;
        byte[] original = storage().read(asset.storageKey);
        variants.delete("asset", asset);
        for (SlotSpecs.Slot slot : SlotSpecs.ALL) {
            byte[] rendered = ImageVariants.render(original, slot);
            String key = "var/" + asset.id + "/" + slot.name() + ".jpg";
            storage().write(key, new java.io.ByteArrayInputStream(rendered), rendered.length, "image/jpeg");
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
        for (MediaVariant v : variants.list("asset", asset)) storage().delete(v.storageKey);
        storage().delete(asset.storageKey);
        variants.delete("asset", asset);
        assets.delete(asset);
    }

    public String variantUrl(MediaAsset asset, String slotName) {
        MediaVariant v = variants.find("asset = ?1 and variantName = ?2", asset, slotName).firstResult();
        return v == null ? null : "/site/media/file/" + v.storageKey;
    }

    /** Raw object read for the public byte-serving endpoint (SiteResource). */
    public byte[] read(String storageKey) {
        return storage().read(storageKey);
    }

    public Map<String, String> variantUrls(MediaAsset asset) {
        return variants.stream("asset", asset).collect(Collectors.toMap(
                v -> v.variantName, v -> "/site/media/file/" + v.storageKey, (a, b) -> a));
    }
}
