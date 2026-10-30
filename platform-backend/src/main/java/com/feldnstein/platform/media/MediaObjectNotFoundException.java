package com.feldnstein.platform.media;

public class MediaObjectNotFoundException extends RuntimeException {
    public MediaObjectNotFoundException(String storageKey) {
        super("media object not found: " + storageKey);
    }
}
