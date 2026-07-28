# ============================================
# AI Service — FastAPI Main
# Entry point for Prescription OCR
# ============================================

import os
import time
import uuid
import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from src.models import OcrResponse
from src.summary_models import SummarizeRequest, ReportSummary
from src.chat_models import ChatRequest, ChatResponse
from src.ocr_engine import OCREngine
from src.extraction_engine import ExtractionEngine
from src.summary_engine import SummaryEngine
from src.chat_engine import ChatEngine

load_dotenv()

app = FastAPI(title="Maate AI OCR Service")

# CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize engines
ocr_engine = OCREngine()
extraction_engine = ExtractionEngine()
summary_engine = SummaryEngine()
chat_engine = ChatEngine()

TEMP_DIR = "temp_uploads"
os.makedirs(TEMP_DIR, exist_ok=True)

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "ai-ocr"}

@app.post("/process-prescription", response_model=OcrResponse)
async def process_prescription(file: UploadFile = File(...)):
    """Synchronous endpoint for processing prescriptions"""
    start_time = time.time()
    
    # 1. Save temp file
    file_id = str(uuid.uuid4())
    ext = file.filename.split('.')[-1]
    temp_path = os.path.join(TEMP_DIR, f"{file_id}.{ext}")
    
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # 2. Run OCR
        raw_text = await ocr_engine.extract_text(temp_path)
        
        # 3. Run AI Extraction
        structured_data = await extraction_engine.extract_entities(raw_text)
        
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        return OcrResponse(
            document_id=file_id,
            raw_text=raw_text,
            structured_data=structured_data,
            processing_time_ms=processing_time_ms
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        # Cleanup
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.post("/async-process-prescription")
async def async_process_prescription(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...),
    callback_url: str = None
):
    """Asynchronous endpoint with background tasks"""
    # Logic to save file and enqueue for background processing
    # In production, this would use Celery/Redis
    return {"message": "Processing started", "job_id": str(uuid.uuid4())}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

@app.post("/summarize", response_model=ReportSummary)
async def summarize_report(req: SummarizeRequest):
    """Summarize medical report with trend analysis"""
    try:
        return await summary_engine.summarize(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Conversational RAG for health queries"""
    try:
        return await chat_engine.generate_response(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
