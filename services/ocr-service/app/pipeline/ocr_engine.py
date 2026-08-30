"""OCR Engine — Tesseract with Google Vision fallback."""
import logging

from app.config import settings

logger = logging.getLogger(__name__)


class OCREngine:
    """Dual-engine OCR with automatic fallback."""

    def __init__(self):
        self.engine_name = "tesseract"
        self.confidence_threshold = 0.6

    def extract(self, image_data: bytes) -> tuple[str, float]:
        """
        Extract text using Tesseract, fallback to Google Vision if confidence < threshold and API key is set.

        Returns: (raw_text, confidence_score)
        """
        # Primary: Tesseract
        text, confidence = self._tesseract_extract(image_data)

        if (not text or confidence < self.confidence_threshold) and settings.GOOGLE_VISION_API_KEY:
            logger.info(f"Tesseract confidence {confidence:.2f} < {self.confidence_threshold}, falling back to Google Vision")
            text, confidence = self._google_vision_extract(image_data)
            self.engine_name = "google_vision"

        return text, confidence

    def _tesseract_extract(self, image_data: bytes) -> tuple[str, float]:
        """Extract using Tesseract 5.x."""
        from PIL import Image
        import io
        import pytesseract
        import pandas as pd

        try:
            image = Image.open(io.BytesIO(image_data))
            
            # Get detailed OCR data including confidence
            data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
            
            # Filter out empty strings and calculate mean confidence
            confidences = [int(conf) for conf in data['conf'] if conf != -1]
            avg_confidence = sum(confidences) / len(confidences) / 100.0 if confidences else 0.0
            
            # Extract full text
            text = pytesseract.image_to_string(image)
            
            return text.strip(), avg_confidence
        except Exception as e:
            logger.error(f"Tesseract extraction failed: {e}")
            return "", 0.0

    def _google_vision_extract(self, image_data: bytes) -> tuple[str, float]:
        """Fallback extraction using Google Cloud Vision API."""
        # TODO: Implement with google-cloud-vision
        return "Sample extracted text", 0.92
