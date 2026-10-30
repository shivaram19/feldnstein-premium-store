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
