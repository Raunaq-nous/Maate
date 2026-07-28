# ============================================
# AI Service — OCR Engine
# Powered by PaddleOCR
# ============================================

import os
import cv2
import numpy as np
from paddleocr import PaddleOCR
import logging

logger = logging.getLogger(__name__)

class OCREngine:
    def __init__(self):
        # Initialize PaddleOCR with English and Hindi support
        # use_angle_cls=True helps with rotated images (common in mobile capture)
        self.ocr = PaddleOCR(
            use_angle_cls=True, 
            lang='en', 
            show_log=False,
            det_db_thresh=0.3,
            det_db_box_thresh=0.5
        )

    async def extract_text(self, image_path: str) -> str:
        """Extract raw text from image with spatial awareness"""
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image not found: {image_path}")

        try:
            # Run OCR
            result = self.ocr.ocr(image_path, cls=True)
            
            # PaddleOCR returns a list of lists: [[box, (text, confidence)], ...]
            full_text = []
            for line in result:
                if line:
                    for res in line:
                        text = res[1][0]
                        full_text.append(text)
            
            return "\n".join(full_text)
            
        except Exception as e:
            logger.error(f"OCR failed: {str(e)}")
            raise e

    def preprocess_image(self, image_bytes: bytes):
        """Image enhancement for better OCR accuracy"""
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # 1. Grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # 2. Denoising
        denoised = cv2.fastNlMeansDenoising(gray, h=10)
        
        # 3. Adaptive Thresholding
        thresh = cv2.adaptiveThreshold(
            denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY, 11, 2
        )
        
        return thresh
