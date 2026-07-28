"""Medical Named Entity Recognition."""
import logging
from typing import Any

logger = logging.getLogger(__name__)


class MedicalNERExtractor:
    """Extract medical entities from OCR text using SpaCy + custom rules."""

    def extract(self, text: str, document_type: str) -> list[dict[str, Any]]:
        """
        Extract medical entities based on document type.
        Entities: test_name, value, unit, reference_range, doctor, hospital, date
        """
        import re

        entities = []
        
        if document_type == "lab_report":
            # Simple pattern for "Parameter: Value Unit"
            # e.g., "Glucose: 95 mg/dL" or "Hemoglobin 14.2 g/dL"
            patterns = [
                r"(?P<name>Glucose|Hemoglobin|HbA1c|Cholesterol|Creatinine)[\s:]+(?P<value>\d+\.?\d*)\s*(?P<unit>[a-zA-Z/%]+)"
            ]
            
            for pattern in patterns:
                for match in re.finditer(pattern, text, re.IGNORECASE):
                    entities.append({
                        "label": "LAB_RESULT",
                        "text": match.group(0),
                        "metadata": {
                            "parameter": match.group("name"),
                            "value": match.group("value"),
                            "unit": match.group("unit")
                        }
                    })

        elif document_type == "prescription":
            # Simple pattern for medication names (stub list)
            meds = ["Paracetamol", "Amoxicillin", "Metformin", "Atorvastatin"]
            for med in meds:
                if med.lower() in text.lower():
                    entities.append({
                        "label": "MEDICATION",
                        "text": med,
                        "metadata": {"name": med}
                    })

        logger.info(f"NER extraction for {document_type}: found {len(entities)} entities")
        return entities
