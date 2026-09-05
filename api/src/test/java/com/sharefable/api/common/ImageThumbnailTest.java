package com.sharefable.api.common;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.zip.CRC32;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ImageThumbnailTest {
  private byte[] image() throws IOException {
    var image = new BufferedImage(720, 480, BufferedImage.TYPE_INT_RGB);
    var graphics = image.createGraphics();
    graphics.setColor(Color.RED);
    graphics.fillRect(0, 0, 720, 480);
    graphics.dispose();
    var output = new ByteArrayOutputStream();
    ImageIO.write(image, "png", output);
    return output.toByteArray();
  }

  @Test void producesTheExistingThumbnailSizeAndVisibleContent() throws Exception {
    var thumbnail = ImageIO.read(new ByteArrayInputStream(ImageThumbnail.create(image(), 360, 240)));
    assertEquals(360, thumbnail.getWidth());
    assertEquals(240, thumbnail.getHeight());
    assertTrue(new Color(thumbnail.getRGB(180, 120)).getRed() > 240);
  }

  @Test void rejectsCorruptAndOversizedInputsInsteadOfReturningABlankThumbnail() throws Exception {
    assertThrows(IOException.class, () -> ImageThumbnail.create(new byte[] {1, 2, 3}, 360, 240));
    byte[] oversized = image();
    ByteBuffer.wrap(oversized).putInt(16, 32769);
    var crc = new CRC32();
    crc.update(oversized, 12, 17);
    ByteBuffer.wrap(oversized).putInt(29, (int) crc.getValue());
    assertThrows(IOException.class, () -> ImageThumbnail.create(oversized, 360, 240));
  }
}
