package com.feldnstein.platform.media;

import java.io.InputStream;
import java.util.Map;

public interface MediaStorage {

    /** Result of creating an upload target. uploadUrl is absolute (S3) or API-relative (disk). */
    record UploadTarget(String uploadUrl, String method, Map<String, String> headers, String storageKey) {}

    UploadTarget presignPut(String storageKey, String contentType, long sizeBytes);

    /**
     * Read object bytes.
     *
     * @throws MediaObjectNotFoundException if the object does not exist
     */
    byte[] read(String storageKey);

    void write(String storageKey, InputStream bytes, long sizeBytes, String contentType);

    void delete(String storageKey);
}
