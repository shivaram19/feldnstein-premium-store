package com.feldnstein.platform.media;

import jakarta.enterprise.context.ApplicationScoped;
import io.quarkus.arc.lookup.LookupIfProperty;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.util.Map;

@ApplicationScoped
@LookupIfProperty(name = "media.storage.type", stringValue = "disk", lookupIfMissing = true)
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
        } catch (NoSuchFileException e) {
            throw new MediaObjectNotFoundException(storageKey);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
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
