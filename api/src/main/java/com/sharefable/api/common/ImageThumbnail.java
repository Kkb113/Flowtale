package com.sharefable.api.common;

import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.MemoryCacheImageInputStream;

/** Validates encoded dimensions before decoding an uploaded thumbnail input. */
public final class ImageThumbnail {
  private ImageThumbnail() {}

  public static byte[] create(byte[] input, int width, int height) throws IOException {
    try (var stream = new MemoryCacheImageInputStream(new ByteArrayInputStream(input))) {
      var readers = ImageIO.getImageReaders(stream);
      if (!readers.hasNext()) throw new IOException("Upload is not a supported image");
      ImageReader reader = readers.next();
      try {
        reader.setInput(stream, true, true);
        int sourceWidth = reader.getWidth(0);
        int sourceHeight = reader.getHeight(0);
        if (sourceWidth < 1 || sourceHeight < 1 || sourceWidth > 32768 || sourceHeight > 32768
            || (long) sourceWidth * sourceHeight > 64_000_000) {
          throw new IOException("Image exceeds the supported dimensions (32,768 per side, 64 million pixels)");
        }
        var parameters = reader.getDefaultReadParam();
        int sample = Math.max(1, Math.min(sourceWidth / width, sourceHeight / height));
        parameters.setSourceSubsampling(sample, sample, 0, 0);
        BufferedImage original = reader.read(0, parameters);
        if (original == null) throw new IOException("Image could not be decoded");
        BufferedImage result = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = result.createGraphics();
        try {
          graphics.drawImage(original, 0, 0, width, height, null);
          var output = new ByteArrayOutputStream();
          if (!ImageIO.write(result, "jpeg", output)) throw new IOException("JPEG encoder is unavailable");
          return output.toByteArray();
        } finally {
          graphics.dispose();
          original.flush();
          result.flush();
        }
      } finally { reader.dispose(); }
    }
  }
}
