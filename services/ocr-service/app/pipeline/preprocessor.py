"""Image preprocessing for OCR optimization."""
import io
import logging

logger = logging.getLogger(__name__)


class ImagePreprocessor:
    """Preprocess images for optimal OCR accuracy."""

    def process(self, content: bytes, content_type: str) -> bytes:
        """
        Apply preprocessing pipeline:
        1. PDF → Image conversion (if PDF)
        2. Deskew correction
        3. Noise removal
        4. Contrast normalization
        5. Binarization
        6. Auto-crop
        """
        logger.info(f"Preprocessing document ({content_type}, {len(content)} bytes)")

        if content_type == "application/pdf":
            return self._process_pdf(content)
        else:
            return self._process_image(content)

    def _process_pdf(self, content: bytes) -> bytes:
        """Extract pages from PDF and convert to images."""
        # TODO: Implement with PyPDF2 + pdf2image
        return content

    def _process_image(self, content: bytes) -> bytes:
        """
        Apply image enhancement pipeline:
        1. Alpha / palette conversion to solid white background
        2. Grayscale conversion
        3. Autocontrast dynamic range normalization
        4. Resolution upscale for low-DPI / small text (preserves decimal points and small punctuation)
        5. Save as 300 DPI PNG
        """
        from PIL import Image, ImageOps

        try:
            image = Image.open(io.BytesIO(content))

            # 1. Flatten alpha/palette to clean white background
            if image.mode in ("RGBA", "LA", "P"):
                background = Image.new("RGB", image.size, (255, 255, 255))
                if image.mode in ("RGBA", "LA"):
                    background.paste(image, mask=image.split()[-1])
                else:
                    background.paste(image)
                image = background
            elif image.mode not in ("RGB", "L"):
                image = image.convert("RGB")

            # 2. Convert to grayscale
            gray = ImageOps.grayscale(image)

            # 3. Dynamic range autocontrast
            gray = ImageOps.autocontrast(gray, cutoff=1)

            # 4. Smart upscale: Tesseract LSTM requires ~30px character height.
            # Low-res or standard 72/96 DPI images have tiny 1-2px dots that get filtered as speckle noise.
            w, h = gray.size
            scale = 1.0
            if w < 1200:
                scale = 2.5
            elif w < 2000:
                scale = 1.5

            if scale > 1.0:
                new_w = int(w * scale)
                new_h = int(h * scale)
                gray = gray.resize((new_w, new_h), Image.Resampling.LANCZOS)

            buf = io.BytesIO()
            gray.save(buf, format="PNG", dpi=(300, 300))
            return buf.getvalue()
        except Exception as e:
            logger.warning(f"Image preprocessing fallback to raw content: {e}")
            return content
