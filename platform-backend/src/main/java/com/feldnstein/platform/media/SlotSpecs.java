package com.feldnstein.platform.media;

import java.util.List;

public final class SlotSpecs {
    public record Slot(String name, int ratioW, int ratioH, int width, int height) {}

    public static final List<Slot> ALL = List.of(
            new Slot("card",   4,  5,  800, 1000),
            new Slot("hero",  16,  9,  1920, 1080),
            new Slot("banner",21,  9,  1680, 720),
            new Slot("thumb",  4,  5,  200, 250));

    private SlotSpecs() {}
}
