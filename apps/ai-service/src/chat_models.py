# ============================================
# AI Service — RAG Models
# ============================================

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    user_id: str
    session_id: str
    message: str
    history: List[ChatMessage] = Field(default_factory=list)
    context_filters: Optional[Dict[str, Any]] = None

class RetrievalResult(BaseModel):
    source: str  # 'vector' or 'sql'
    content: str
    metadata: Dict[str, Any]

class ChatResponse(BaseModel):
    answer: str
    sources: List[RetrievalResult] = Field(default_factory=list)
    suggested_actions: List[str] = Field(default_factory=list)
    confidence_score: float
