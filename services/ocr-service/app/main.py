# ============================================
# MAATE OCR Service — FastAPI Application
# ============================================

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import os

from app.pipeline.preprocessor import ImagePreprocessor
from app.pipeline.ocr_engine import OCREngine
from app.pipeline.ner_extractor import MedicalNERExtractor
from app.pipeline.postprocessor import PostProcessor
from app.config import settings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup & shutdown lifecycle."""
    logger.info("🔬 OCR Service starting...")
    yield
    logger.info("🔬 OCR Service shutting down...")


app = FastAPI(
    title="Maate OCR Service",
    description="Medical document OCR extraction pipeline",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ocr-service"}


from pydantic import BaseModel
import httpx

class OCRExtractRequest(BaseModel):
    file_url: str
    document_id: str
    document_type: str = "lab_report"

@app.post("/api/v1/ocr/upload")
async def extract_upload(
    file: UploadFile = File(...),
    document_id: str = "unknown",
    document_type: str = "lab_report"
):
    """
    Extract text from uploaded file.
    """
    try:
        content = await file.read()
        
        # Step 1: Preprocess
        preprocessor = ImagePreprocessor()
        processed = preprocessor.process(content, file.content_type)

        # Step 2: OCR
        engine = OCREngine()
        raw_text, confidence = engine.extract(processed)

        # Step 3: Medical NER
        ner = MedicalNERExtractor()
        entities = ner.extract(raw_text, document_type)

        # Step 4: Post-process
        postprocessor = PostProcessor()
        structured = postprocessor.structure(entities, document_type)

        return {
            "data": {
                "raw_text": raw_text,
                "structured_data": structured,
                "confidence_score": confidence,
                "engine_used": engine.engine_name,
            }
        }
    except Exception as e:
        logger.error(f"OCR upload extraction failed: {e}")
        raise HTTPException(500, str(e))


@app.post("/api/v1/ocr/extract")
async def extract_document(request: OCRExtractRequest):
    """
    Extract text and structured data from medical documents via URL.

    Pipeline: Download → Preprocess → OCR → NER → Post-process → Structured JSON
    """
    try:
        # Step 0: Download file
        async with httpx.AsyncClient() as client:
            response = await client.get(request.file_url)
            if response.status_code != 200:
                raise HTTPException(400, f"Failed to fetch file from URL: {response.status_code}")
            content = response.content
            content_type = response.headers.get("content-type", "application/octet-stream")

        # Step 1: Preprocess image
        preprocessor = ImagePreprocessor()
        processed = preprocessor.process(content, content_type)

        # Step 2: Run OCR
        engine = OCREngine()
        raw_text, confidence = engine.extract(processed)

        # Step 3: Medical NER
        ner = MedicalNERExtractor()
        entities = ner.extract(raw_text, request.document_type)

        # Step 4: Post-process & structure
        postprocessor = PostProcessor()
        structured = postprocessor.structure(entities, request.document_type)

        return {
            "data": {
                "raw_text": raw_text,
                "structured_data": structured,
                "confidence_score": confidence,
                "engine_used": engine.engine_name,
                "entities_found": len(entities),
            }
        }
    except Exception as e:
        logger.error(f"OCR extraction failed for doc {request.document_id}: {e}")
        raise HTTPException(500, f"OCR extraction failed: {str(e)}")


@app.post("/api/v1/ocr/extract-batch")
async def extract_batch(files: list[UploadFile] = File(...)):
    """Batch extract multiple documents."""
    results = []
    for file in files[:10]:  # Max 10 files per batch
        try:
            content = await file.read()
            preprocessor = ImagePreprocessor()
            processed = preprocessor.process(content, file.content_type)

            engine = OCREngine()
            raw_text, confidence = engine.extract(processed)

            results.append(
                {
                    "filename": file.filename,
                    "status": "completed",
                    "confidence": confidence,
                    "text_length": len(raw_text),
                }
            )
        except Exception as e:
            results.append(
                {"filename": file.filename, "status": "failed", "error": str(e)}
            )

    return {"data": results}
