"""Post-processing — Structure extracted entities into JSON."""
from typing import Any


class PostProcessor:
    """Normalize and structure NER output into typed JSON."""

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
                tests.append(ent["metadata"])
        return {"tests": tests, "metadata": {"count": len(tests)}}

    def _structure_prescription(self, entities: list[dict]) -> dict:
        medications = []
        for ent in entities:
            if ent["label"] == "MEDICATION":
                medications.append(ent["metadata"])
        return {"medications": medications, "metadata": {"count": len(medications)}}
