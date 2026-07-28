# ============================================
# AI Service — Extraction Engine
# Powered by OpenAI GPT-4o
# ============================================

import os
import json
from openai import AsyncOpenAI
from src.models import PrescriptionExtraction, MedicationEntity
import logging

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """
You are a highly accurate Medical Document Specialist. 
Your task is to extract structured medical information from raw OCR text of a prescription.

Rules:
1. Extract all medicines, including dosage (e.g., 500mg), timing (e.g., BD, OD, After Food), duration, and frequency.
2. Identify the Doctor's name and Clinic/Hospital name.
3. Identify the Diagnosis or complaints if mentioned.
4. Extract the prescription date.
5. If you see common abbreviations like TDS, BD, OD, QID, convert them to standard frequency terms if possible, or keep as is.
6. Return a valid JSON object matching the provided schema.
7. Be conservative: if a value is ambiguous, mark it clearly or use null.

Medical abbreviations reference:
- OD: Once daily
- BD/BID: Twice daily
- TDS/TID: Three times daily
- QID: Four times daily
- SOS: As needed
- HS: At bedtime
"""

class ExtractionEngine:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o")

    async def extract_entities(self, raw_text: str) -> PrescriptionExtraction:
        """Use LLM to structure raw OCR text into clinical entities"""
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"OCR Text:\n{raw_text}"}
                ],
                response_format={"type": "json_object"},
                temperature=0.1  # Low temperature for deterministic output
            )

            structured_json = json.loads(response.choices[0].message.content)
            
            # Pydantic validation
            return PrescriptionExtraction(**structured_json)

        except Exception as e:
            logger.error(f"Extraction failed: {str(e)}")
            # Fallback to empty model on failure
            return PrescriptionExtraction(medications=[], confidence_score=0.0)
