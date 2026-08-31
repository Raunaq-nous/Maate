"""Post-processing — Structure extracted entities into JSON."""
import re
from typing import Any

# Lookup table for common OCR misreadings of medical units (e.g. '/' misread as 'i', 'l', '|', '1')
COMMON_UNIT_MAP: dict[str, str] = {
    # mg/dL
    "mgidl": "mg/dL",
    "mgldl": "mg/dL",
    "mg/dl": "mg/dL",
    "mg/dl.": "mg/dL",
    # g/dL
    "gidl": "g/dL",
    "gldl": "g/dL",
    "g/dl": "g/dL",
    "g/dl.": "g/dL",
    # mcg/dL & ug/dL
    "mcgidl": "mcg/dL",
    "mcgldl": "mcg/dL",
    "mcg/dl": "mcg/dL",
    "ugidl": "mcg/dL",
    "ugldl": "mcg/dL",
    "ug/dl": "mcg/dL",
    # ng/mL & ng/dL
    "ngiml": "ng/mL",
    "ng/ml": "ng/mL",
    "ngidl": "ng/dL",
    "ng/dl": "ng/dL",
    # pg/mL
    "pgiml": "pg/mL",
    "pg/ml": "pg/mL",
    # mmol/L
    "mmoiil": "mmol/L",
    "mmolil": "mmol/L",
    "mmol/l": "mmol/L",
    "umol/l": "umol/L",
    "umolil": "umol/L",
    # mEq/L
    "meqil": "mEq/L",
    "meq/l": "mEq/L",
    # IU/L
    "iuil": "IU/L",
    "iu/l": "IU/L",
    # uIU/mL & mIU/mL
    "uiuiml": "uIU/mL",
    "uiu/ml": "uIU/mL",
    "miuiml": "mIU/mL",
    "miu/ml": "mIU/mL",
}


class PostProcessor:
    """Normalize and structure NER output into typed JSON."""

    @staticmethod
    def normalize_unit(unit: str | None) -> str:
        """
        Normalize common OCR misreadings of medical units.
        E.g. 'mgidL' -> 'mg/dL', 'gidL' -> 'g/dL'.
        """
        if not unit:
            return ""

        cleaned = unit.strip()
        key = cleaned.lower().replace("|", "i").replace("!", "i").replace("1", "l")

        if key in COMMON_UNIT_MAP:
            return COMMON_UNIT_MAP[key]

        # Rule-based fallback for [prefix]idL or [prefix]ldL -> [prefix]/dL
        if re.search(r"^[a-zA-Z]+[il][dD][lL]\.?$", cleaned):
            fixed = re.sub(r"[il]([dD][lL])\.?$", r"/\1", cleaned)
            return fixed.replace("DL", "dL").replace("dl", "dL")

        # Rule-based fallback for [prefix]imL or [prefix]lmL -> [prefix]/mL
        if re.search(r"^[a-zA-Z]+[il][mM][lL]\.?$", cleaned):
            fixed = re.sub(r"[il]([mM][lL])\.?$", r"/\1", cleaned)
            return fixed.replace("ML", "mL").replace("ml", "mL")

        return cleaned

    def structure(self, entities: list[dict[str, Any]], document_type: str) -> dict:
        """Convert raw entities into structured document data."""
        if document_type == "lab_report":
            return self._structure_lab_report(entities)
        elif document_type == "prescription":
            return self._structure_prescription(entities)
        return {"raw_entities": entities}

    def _structure_lab_report(self, entities: list[dict]) -> dict:
        tests = []
        for ent in entities:
            if ent["label"] == "LAB_RESULT":
                item = dict(ent["metadata"])
                if "unit" in item and item["unit"]:
                    item["unit"] = self.normalize_unit(item["unit"])
                tests.append(item)
        return {"tests": tests, "metadata": {"count": len(tests)}}

    def _structure_prescription(self, entities: list[dict]) -> dict:
        medications = []
        for ent in entities:
            if ent["label"] == "MEDICATION":
                medications.append(ent["metadata"])
        return {"medications": medications, "metadata": {"count": len(medications)}}
