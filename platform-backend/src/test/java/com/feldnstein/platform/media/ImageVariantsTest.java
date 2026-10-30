package com.feldnstein.platform.media;

import org.junit.jupiter.api.Test;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;

import static org.junit.jupiter.api.Assertions.*;

class ImageVariantsTest {

    private static byte[] png(int w, int h, boolean alpha) throws Exception {
        BufferedImage img = new BufferedImage(w, h, alpha ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB);
        java.awt.Graphics2D g = img.createGraphics();
        g.setColor(alpha ? new java.awt.Color(255, 0, 0, 0) : java.awt.Color.RED);
        g.fillRect(0, 0, w, h);
        g.dispose();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, "png", out);
        return out.toByteArray();
    }

    @Test
    void sniffDetectsPngAndRejectsJunk() throws Exception {
        assertEquals("image/png", ImageVariants.sniffContentType(png(4, 4, false)));
        assertNull(ImageVariants.sniffContentType(new byte[]{1, 2, 3, 4, 5, 6, 7, 8}));
    }

    @Test
    void renderProducesSizedJpegForOpaquePng() throws Exception {
        byte[] jpg = ImageVariants.render(png(40, 50, false), SlotSpecs.ALL.get(3)); // thumb 200x250
        BufferedImage out = ImageIO.read(new ByteArrayInputStream(jpg));
        assertNotNull(out);
        assertEquals(200, out.getWidth());
        assertEquals(250, out.getHeight());
    }

    @Test
    void renderFlattensTransparentPng() throws Exception {
        byte[] jpg = ImageVariants.render(png(40, 50, true), SlotSpecs.ALL.get(3));
        assertNotNull(ImageIO.read(new ByteArrayInputStream(jpg)));
    }
}
