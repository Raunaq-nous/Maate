# ============================================
# AI Service — Summary Models
# ============================================

from typing import List, Optional, Dict
from pydantic import BaseModel, Field

class LabValue(BaseModel):
    parameter: str
    value: str
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    is_abnormal: bool
    interpretation: Optional[str] = None
    trend: Optional[str] = Field(None, description="UP, DOWN, or STABLE compared to historical")

class ReportSummary(BaseModel):
    overall_status: str = Field(..., description="NORMAL, ABNORMAL, or CRITICAL")
    layperson_summary: str = Field(..., description="Simple, easy-to-understand summary")
    clinical_summary: str = Field(..., description="Technical summary for doctors")
    key_findings: List[LabValue] = Field(default_factory=list)
    risk_flags: List[str] = Field(default_factory=list, description="Immediate concerns or critical values")
    recommendations: List[str] = Field(default_factory=list, description="Next steps or doctor consultation advice")
    citations: List[str] = Field(default_factory=list, description="Direct quotes from the source text")
    confidence_score: float = Field(0.0, ge=0.0, le=1.0)
    hallucination_check: bool = Field(True, description="Self-verification status")

class SummarizeRequest(BaseModel):
    document_id: str
    ocr_text: str
    historical_context: Optional[List[Dict]] = Field(None, description="Previous lab results for trend analysis")
    document_type: str
