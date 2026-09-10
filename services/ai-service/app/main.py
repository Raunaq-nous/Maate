# ============================================
# MAATE AI Service — Summarization & Chatbot
# ============================================

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional
import logging

from app.summarizer.engine import SummarizerEngine
from app.chatbot.engine import ChatbotEngine
from app.embeddings.engine import EmbeddingEngine
from app.config import settings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🤖 AI Service starting...")
    # Pre-warm the embedding engine so first request is instant
    try:
        EmbeddingEngine()
        logger.info("🤖 Embedding engine pre-warmed.")
    except Exception as e:
        logger.warning(f"Embedding engine pre-warming warning: {e}")
    yield
    logger.info("🤖 AI Service shutting down...")


app = FastAPI(
    title="Maate AI Service",
    description="Medical report summarization & health chatbot with local embeddings",
    version="0.2.0",
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
    structured_data: Optional[Dict[str, Any]] = None
    raw_text: Optional[str] = None
    user_locale: str = "en-IN"


class EmbeddingsRequest(BaseModel):
    texts: List[str]


class ChatRequest(BaseModel):
    session_id: str
    user_id: str
    message: str
    history: Optional[List[Dict[str, Any]]] = None
    context_chunks: Optional[List[Dict[str, Any]]] = None
    health_profile: Optional[Dict[str, Any]] = None
    context_type: str = "general"
    context_ref_id: Optional[str] = None


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ai-service", "embedding_model": "BAAI/bge-small-en-v1.5"}


@app.post("/api/v1/ai/embeddings")
async def generate_embeddings(request: EmbeddingsRequest):
    """Generate 384-dimensional normalized embeddings for input texts."""
    try:
        engine = EmbeddingEngine()
        embeddings = engine.embed_texts(request.texts)
        return {
            "data": {
                "embeddings": embeddings,
                "count": len(embeddings),
                "dimensions": 384,
                "model": "BAAI/bge-small-en-v1.5",
            }
        }
    except Exception as e:
        logger.error(f"Embedding generation failed: {e}", exc_info=True)
        raise HTTPException(500, f"Embedding generation failed: {str(e)}")


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
        logger.error(f"Summarization failed: {e}", exc_info=True)
        raise HTTPException(500, f"Summarization failed: {str(e)}")


@app.post("/api/v1/ai/chat")
@app.post("/chat")
async def chat(request: ChatRequest):
    """Process a chatbot message with grounded RAG context and emergency intercept."""
    try:
        engine = ChatbotEngine()
        response = await engine.respond(
            user_id=request.user_id,
            message=request.message,
            session_id=request.session_id,
            history=request.history,
            context_chunks=request.context_chunks,
            health_profile=request.health_profile,
        )
        return {"data": response}
    except Exception as e:
        logger.error(f"Chat failed: {e}", exc_info=True)
        raise HTTPException(500, f"Chat failed: {str(e)}")
