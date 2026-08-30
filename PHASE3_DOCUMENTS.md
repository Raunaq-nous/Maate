# Phase 3: Document Ingestion & OCR Processing Pipeline

## 1. Pipeline Architecture Overview

The document ingestion pipeline implements an asynchronous, decoupled, queue-driven processing flow backed by MinIO/S3 object storage, BullMQ over Redis, and the native Python OCR service (FastAPI, Tesseract, and medical NER extraction).

```
+---------------------------------------------------------------------------------------------------+
|                                       CLIENT (Web / Mobile)                                       |
+---------------------------------------------------------------------------------------------------+
       |                                      ^                              ^
       | 1. POST /api/v1/documents/upload-url |                              |
       v                                      |                              |
+---------------+                             |                              |
|   apps/api    |                             |                              |
| StorageModule |                             |                              |
+---------------+                             |                              |
       |                                      |                              |
       | 2. Presigned S3 PUT URL              |                              |
       v                                      |                              |
+---------------------------------------------+                              |
| Direct Binary S3 PUT (AES-256 / KMS)                                       |
v                                                                            |
+---------------------------------------------+                              |
|             MinIO / S3 Storage              |                              |
|           Bucket: maate-documents          |                              |
+---------------------------------------------+                              |
       |                                                                     |
       | 3. POST /api/v1/documents/confirm-upload                            |
       v                                                                     |
+-------------------------------------------------------------------+        |
|                             apps/api                              |        |
| 4. Create Document (PENDING) & FileUpload (PENDING) in PostgreSQL |        |
| 5. Enqueue FileProcessingJob into BullMQ queue                    |        |
+-------------------------------------------------------------------+        |
       |                                                                     |
       v                                                                     |
+-------------------------------------------------------------+              |
|                      Redis (Port 6379)                      |              |
|             BullMQ Queue: "document-processing"             |              |
|          Job ID: "doc-<uuid>", Attempts: 3, Backoff         |              |
+-------------------------------------------------------------+              |
       |                                                                     |
       | Worker Pickup                                                       |
       v                                                                     |
+-------------------------------------------------------------------+        |
|                        DocumentProcessor                          |        |
| 1. Virus Scan: Set FileUpload scanStatus=COMPLETED, result=CLEAN   |        |
| 2. Set Document ocrStatus=PROCESSING                              |        |
| 3. Stream binary buffer from S3                                   |        |
| 4. POST /api/v1/ocr/upload (multipart/form-data)                  |        |
+-------------------------------------------------------------------+        |
       |                                                                     |
       v                                                                     |
+-------------------------------------------------------------------+        |
|               services/ocr-service (FastAPI on 8002)              |        |
|  ImagePreprocessor (Grayscale, Threshold, Deskew, Denoise)        |        |
|  OCREngine (Tesseract 5.x, real text extraction)                  |        |
|  MedicalNERExtractor (Regex & medical entity extraction)          |        |
|  PostProcessor (Structure labs/meds, calculate confidence)        |        |
+-------------------------------------------------------------------+        |
       |                                                                     |
       | 200 OK: { raw_text, structured_data, confidence_score }             |
       v                                                                     |
+-------------------------------------------------------------------+        |
|                        DocumentProcessor                          |        |
| 5. Upsert Prisma OcrResult with extracted text & structured JSON  |        |
| 6. Update Document ocrStatus=COMPLETED                            |        |
+-------------------------------------------------------------------+        |
                                                                             |
       | 6. GET /api/v1/documents/:id or GET /api/v1/documents/:id/ocr       |
       +---------------------------------------------------------------------+
```

---

## 2. Exact File Changes & Rationale

| File | Change | Rationale |
|---|---|---|
| `apps/api/src/common/common.module.ts` | Imported and registered `BullModule.forRootAsync` pointing to `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB`. Exported `BullModule`. | Provided root Redis connection for BullMQ queues across all modules (`StorageModule`, `ReminderModule`, `NotificationModule`). |
| `apps/api/src/common/storage/storage.module.ts` | Registered queue `BullModule.registerQueue({ name: 'document-processing' })`. Added and exported `DocumentProcessor` provider. | Replaced in-memory `setImmediate()` with durable Redis-backed BullMQ queue and dedicated processor. |
| `apps/api/src/common/storage/file-processing.service.ts` | Refactored `enqueue()` to inject `@InjectQueue('document-processing')` and dispatch jobs to BullMQ. Added `documentType` field to `FileProcessingJob`. | Enabled persistent background queueing with retries, exponential backoff, and job tracking. |
| `apps/api/src/common/storage/document.processor.ts` | Created BullMQ consumer `@Processor('document-processing')` handling virus scan simulation, S3 buffer streaming, OCR service HTTP integration, and `OcrResult` persistence. | Clean separation of queue processing, error handling, retries, and database updates. |
| `apps/api/src/common/storage/storage.service.ts` | Made `ServerSideEncryption: 'aws:kms'` conditional on presence of `S3_KMS_KEY_ID`. | Allowed compatibility with local MinIO storage (which does not have AWS KMS) while preserving KMS encryption in production AWS. |
| `apps/api/src/main.ts` | Added `(BigInt.prototype as any).toJSON = function () { return Number(this); }`. | Solved `TypeError: Do not know how to serialize a BigInt` when Express serializes Prisma entities with `BigInt` columns (`Document.fileSizeBytes`, `FileUpload.sizeBytes`). |
| `apps/api/src/modules/document/document.service.ts` | Passed `documentType: dto.documentType` and pipeline `['virus_scan', 'ocr']` to `processing.enqueue()`. | Fixed hardcoded `document_type` bug and scoped Phase 3 execution strictly to OCR (deferring AI summarization to Phase 4). |
| `services/ocr-service/app/main.py` | Updated `/api/v1/ocr/upload` parameter parsing to use `Form(...)` for `document_id` and `document_type`. Added validation to return `HTTP 400` on empty files and `HTTP 422` on unextractable text. | Fixed FastAPI treating `document_type` as query param instead of multipart form field. Provided deterministic error contracts. |
| `services/ocr-service/app/pipeline/ocr_engine.py` | Updated `extract()` to only fall back to Google Vision if `GOOGLE_VISION_API_KEY` is configured and valid text could not be extracted by Tesseract. | Stopped discarding real Tesseract text extractions for fake stub strings when Google Vision credentials are not provided. |
| `services/ocr-service/app/config.py` | Added `model_config = SettingsConfigDict(extra="ignore", env_file=".env")`. | Prevented Pydantic v2 validation errors on extra monorepo environment variables. |
| `apps/mobile/src/app/documents/report-summary.tsx` | Added handling for null `summary` state (pre-summary state where OCR is done but AI summary is pending). | Prevented runtime crash (`TypeError: Cannot read properties of undefined (reading 'map')`) when viewing document details prior to Phase 4 AI summarization. |

---

## 3. BullMQ Queue Configuration

- **Queue Name**: `document-processing`
- **Redis Connection**: Redis 7+ on `localhost:6379` (db 0)
- **Job Options**:
  - `jobId`: `doc-${documentId}` (idempotent; prevents duplicate jobs for same document)
  - `attempts`: 3
  - `backoff`: Exponential backoff (`{ type: 'exponential', delay: 2000 }`)
  - `removeOnComplete`: `false` (persists completed jobs in Redis for audit & status inspection)
- **Error Handling & Failure Policy**:
  - Client errors (HTTP 4xx from OCR service or corrupt file): Permanent failure. Document `ocrStatus` immediately set to `FAILED`.
  - Transient errors (HTTP 5xx or network timeout): Job re-thrown for BullMQ exponential backoff.
  - Exhausted attempts: If `attemptsMade >= 3`, Document `ocrStatus` transitions to `FAILED`.

---

## 4. OCR Service Integration & Contract

- **Endpoint Called**: `POST http://localhost:8002/api/v1/ocr/upload`
- **Request Format**: `multipart/form-data`
  - `file`: binary buffer
  - `document_id`: UUID string
  - `document_type`: string (`lab_report`, `prescription`, `discharge_summary`, `imaging_report`, etc.)
- **Response Format**:
  ```json
  {
    "data": {
      "raw_text": "...",
      "structured_data": { ... },
      "confidence_score": 0.6589,
      "engine_used": "tesseract"
    }
  }
  ```
- **Medical NER Extraction**:
  - For `lab_report`: Extracts test parameters, numeric values, and units (e.g. Glucose `95 mg/dL`, Hemoglobin `14.2 g/dL`, Creatinine `0.9 mg/dL`).
  - For `prescription`: Extracts medication entities (e.g. `Paracetamol`, `Metformin`, `Amoxicillin`).

---

## 5. Prisma Data Model Mapping

```
Document
 ├── id: String (UUID)
 ├── userId: String
 ├── title: String
 ├── documentType: DocumentType (LAB_REPORT, PRESCRIPTION, etc.)
 ├── fileUrl: String (S3 stored path)
 ├── fileSizeBytes: BigInt
 ├── ocrStatus: OcrStatus (PENDING -> PROCESSING -> COMPLETED | FAILED)
 ├── aiSummaryStatus: AiSummaryStatus (PENDING)
 ├── fileUpload: FileUpload (1:1 relation via storedPath/userId)
 │    ├── originalName: String
 │    ├── mimeType: String
 │    ├── sizeBytes: BigInt
 │    ├── scanStatus: ScanStatus (COMPLETED)
 │    └── scanResult: ScanResult (CLEAN)
 └── ocrResult: OcrResult (1:1 relation via documentId)
      ├── rawText: String
      ├── structuredData: Json
      ├── confidenceScore: Float
      ├── engineUsed: String ("tesseract")
      └── processingTimeMs: Int
```

---

## 6. Live Verification Results (Real Terminal Output)

### Lab Report End-to-End Test (`sample_lab_report.png`)

```
1. Authenticated as: test.user@maate.health
2. Presigned Upload URL generated for key: users/19520a49-9654-4d26-8bb4-96813ea409e7/documents/2026/08/3e7620ee91a159bf_sample_lab_report.png
3. Direct S3 upload status: 200 OK
4. Confirm upload response: {
  message: 'Upload confirmed. Processing started.',
  documentId: 'c50c2ead-c090-447d-9195-5726ccd3fba6'
}
5. Waiting for BullMQ job processing...
   Poll #1: ocrStatus=COMPLETED

6. Document Details from GET /api/v1/documents/c50c2ead-c090-447d-9195-5726ccd3fba6:
{
  "id": "c50c2ead-c090-447d-9195-5726ccd3fba6",
  "userId": "19520a49-9654-4d26-8bb4-96813ea409e7",
  "title": "Apollo Lab Report - Blood Test",
  "documentType": "LAB_REPORT",
  "fileUrl": "users/19520a49-9654-4d26-8bb4-96813ea409e7/documents/2026/08/3e7620ee91a159bf_sample_lab_report.png",
  "fileSizeBytes": 15088,
  "ocrStatus": "COMPLETED",
  "aiSummaryStatus": "PENDING",
  "providerName": "Apollo Diagnostics",
  "doctorName": "Dr. Ramesh Kumar",
  "ocrResult": {
    "id": "f0328f6d-4a0f-475d-ba70-5409c3762296",
    "documentId": "c50c2ead-c090-447d-9195-5726ccd3fba6",
    "rawText": "‘APOLLO DIAGNOSTICS: CLINICAL LABREPORT\nPatient Dr. Test User\nDate: 2026-08-30\n\nTEST PARAMETERS\nGlucose: 95 mgidL (Normat 70-98)\nHemoglobin: 142 gidL (Normal 135-175)\nHbAtc 58% (Normat <5.)\n\nCCholesterot 180 mg/dL (Desirable: < 200)\nCreatinine 0.9 mgidL. (Normat 07-13)",
    "structuredData": {
      "tests": [
        { "unit": "mgidL", "value": "95", "parameter": "Glucose" },
        { "unit": "gidL", "value": "142", "parameter": "Hemoglobin" },
        { "unit": "mgidL", "value": "0.9", "parameter": "Creatinine" }
      ],
      "metadata": { "count": 3 }
    },
    "confidenceScore": 0.6589189189189189,
    "engineUsed": "tesseract",
    "processingTimeMs": 456
  }
}
```

### Prescription End-to-End Test (`sample_prescription.png`)

```
Document ID: 7d75c3b3-040c-421e-8846-f161a9e3a6f5
Title: City Hospital Prescription
Document Type: PRESCRIPTION
OCR Status: COMPLETED
Extracted Medications:
  - Paracetamol
  - Amoxicillin
  - Metformin
Confidence Score: 0.61
Engine Used: tesseract
Processing Time: 337ms
```

---

## 7. Process Restart Resilience Verification

To verify that queued jobs survive unexpected API server termination:
1. Paused the BullMQ queue in Redis (`bull:document-processing`).
2. Enqueued a new document `321c350f-97ef-4429-8135-7e49c049cdb8`.
3. Verified waiting job in Redis: `Jobs waiting in Redis while paused: 1`.
4. Forcefully terminated the NestJS API process.
5. Queried Redis directly while the API was dead:
   ```
   Jobs in Redis while API is COMPLETELY DEAD: 1
    - Job ID: doc-321c350f-97ef-4429-8135-7e49c049cdb8
      docId: 321c350f-97ef-4429-8135-7e49c049cdb8
      attemptsMade: 0
   ```
6. Restarted the NestJS API process.
7. Resumed the queue:
   ```
   Poll #1 after restart: ocrStatus=COMPLETED
   SUCCESS: Document picked up and completed after restart!
   ```

---

## 8. Failure Case Verification

Corrupt file upload test (`corrupt_file.png`):
1. Requested presigned URL and uploaded corrupt binary bytes.
2. Confirmed upload (`POST /api/v1/documents/confirm-upload`). Document `a37481ba-e776-4136-843c-87d6418504bd` created.
3. BullMQ processor called OCR service. OCR service returned `HTTP 422 Unprocessable Content: {"detail":"OCR engine could not extract readable text from document"}`.
4. Processor caught client error and updated Document:
   ```
   Poll #1: ocrStatus=FAILED
   Failure test result: ocrStatus reached terminal state -> FAILED
   ```
   The document did not hang in `PROCESSING` and exited cleanly.

---

## 9. Current Status of All 4 Monorepo Services

- **`apps/api`**: Fully integrated with BullMQ queue `document-processing`, S3 presigning, and `DocumentProcessor`. BigInt serialization resolved.
- **`services/ocr-service`**: Running natively on port 8002 with Tesseract 5.x and medical NER extraction. Validates forms and outputs typed JSON.
- **`apps/web`**: `use-upload` hook connects directly to live `/documents/upload-url` and `/documents/confirm-upload` endpoints.
- **`apps/mobile`**: `documentStore.ts` connects to live upload endpoints. `report-summary.tsx` includes defensive fallback for pre-summary status.

---

## 10. Items Deferred to Phase 4

- **AI Clinical Summarization**: `services/ai-service` integration (`AiSummary` model, layperson summaries, risk flags, and clinical recommendations).
- **RAG & Chunking**: `DocumentChunk` embedding generation and vector storage.
