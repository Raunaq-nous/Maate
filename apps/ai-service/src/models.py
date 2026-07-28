# ============================================
# AI Service — Pydantic Models
# Structured OCR Schema
# ============================================

from typing import List, Optional
from pydantic import BaseModel, Field

class MedicationEntity(BaseModel):
    name: str = Field(..., description="Medicine name")
    dosage: Optional[str] = Field(None, description="Dosage e.g. 500mg, 1 tablet")
    timing: Optional[str] = Field(None, description="Timing e.g. BD, TDS, After breakfast")
    duration: Optional[str] = Field(None, description="Duration e.g. 5 days, 1 month")
    frequency: Optional[str] = Field(None, description="Frequency e.g. Once daily, Every 8 hours")
    instructions: Optional[str] = Field(None, description="Special instructions e.g. Do not chew")

class PrescriptionExtraction(BaseModel):
    doctor_name: Optional[str] = Field(None, description="Doctor's name")
    clinic_name: Optional[str] = Field(None, description="Clinic or Hospital name")
    diagnosis: Optional[str] = Field(None, description="Diagnosis or chief complaints")
    prescription_date: Optional[str] = Field(None, description="Date of prescription")
    medications: List[MedicationEntity] = Field(default_factory=list)
    icd_codes: List[str] = Field(default_factory=list, description="Extracted ICD-10 codes")
    confidence_score: float = Field(0.0, ge=0.0, le=1.0)

class OcrResponse(BaseModel):
    document_id: str
    raw_text: str
    structured_data: PrescriptionExtraction
    processing_time_ms: int
    status: str = "success"
