# ============================================
# MAATE AI Service — Summarization & Chatbot
# ============================================

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
import logging

from app.summarizer.engine import SummarizerEngine
from app.chatbot.engine import ChatbotEngine
from app.config import settings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🤖 AI Service starting...")
    yield
    logger.info("🤖 AI Service shutting down...")


app = FastAPI(
    title="Maate AI Service",
    description="Medical report summarization & health chatbot",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class SummarizeRequest(BaseModel):
    document_id: str
    document_type: str
    structured_data: dict | None = None
    raw_text: str | None = None
    user_locale: str = "en-IN"


class ChatRequest(BaseModel):
    session_id: str
    user_id: str
    message: str
    context_type: str = "general"
    context_ref_id: str | None = None


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ai-service"}


@app.post("/api/v1/ai/summarize")
async def summarize_document(request: SummarizeRequest):
    """Generate AI summary of a medical document."""
    try:
        engine = SummarizerEngine()
        payload = request.structured_data or {}
        if request.raw_text and not payload.get("tests"):
            payload["raw_text"] = request.raw_text

        result = await engine.summarize(
            structured_data=payload,
            document_type=request.document_type,
            locale=request.user_locale,
        )
        return {"data": result}
    except Exception as e:
        logger.error(f"Summarization failed: {e}")
        raise HTTPException(500, f"Summarization failed: {str(e)}")


@app.post("/api/v1/ai/chat")
async def chat(request: ChatRequest):
    """Process a chatbot message with RAG context."""
    try:
        engine = ChatbotEngine()
        response = await engine.respond(
            user_id=request.user_id,
            message=request.message,
            session_id=request.session_id,
            context_type=request.context_type,
            context_ref_id=request.context_ref_id,
        )
        return {"data": response}
    except Exception as e:
        logger.error(f"Chat failed: {e}")
        raise HTTPException(500, f"Chat failed: {str(e)}")
