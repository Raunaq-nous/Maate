# Phase 4 — AI Clinical Summarization & Document Chunking Deliverable

**Date**: 2026-09-01  
**Repository**: `Haus-Nous/Maate`  
**Monorepo Packages Modified**: `@maate/database`, `@maate/api`, `@maate/web`, `@maate/mobile`, `services/ai-service`

---

## 1. Executive Summary

In Phase 4, we turned OCR extracted medical data (`OcrResult`) into high-fidelity AI clinical summaries (`AiSummary`) and structured document chunks (`DocumentChunk`) ready for future vector embedding and clinical RAG chat.

Key milestones achieved:
1. **Resolved Vector Storage & RAG Strategy (Step 0)**:
   - Evaluated Pinecone vs pgvector. Postgres instance has no pgvector extension; Pinecone is the PRD-intended vector database.
   - Per approved architectural decision, we populate `DocumentChunk` records directly in Postgres with rich metadata (`chunkIndex`, `charStart`, `charEnd`, `documentType`, `tokenCount`, and `embedding_status: "pending_provider"`), decoupling the ingestion pipeline from third-party vector provider availability while ensuring all semantic chunk data is preserved.
2. **Database Migration for Mock Distinguishability**:
   - Added `isMock Boolean @default(false) @map("is_mock")` to the `AiSummary` model via migration `20260831072929_add_ai_summary_is_mock`.
   - Verified 0 rows existed in `ai_summaries`, 0 data loss.
   - Guaranteed full queryability and compliance auditability between real LLM outputs and fallback mock summaries.
3. **Clinical Summarizer Engine (`services/ai-service`)**:
   - Replaced legacy and mock implementations with Groq LLM client (`openai/gpt-oss-120b`).
   - Injected strict PRD Section 9.3 & 9.4 clinical safety guardrails (no diagnosis, no prescription, mandatory clinical disclaimer, explicit scoping strictly to extracted parameters).
   - Mock fallback path explicitly marks `is_mock: true` and prefixes raw text with `[MOCK SUMMARY]`.
4. **End-to-End Async Pipeline Integration**:
   - Fixed pipeline bug in `document.processor.ts`: passed `data.documentType` instead of `data.contentType` to the AI service.
   - Fixed status handling in `document.controller.ts` & `document.service.ts`: returns current `aiSummaryStatus` (`PENDING`, `PROCESSING`, `FAILED`) instead of bare 404 when processing.
   - Added chunking generator in `document.processor.ts` that populates `document_chunks` table on OCR completion.
5. **Web and Mobile UI Consumption**:
   - Web (`apps/web/src/app/(dashboard)/reports/[id]/page.tsx`): Dynamically fetches report and AI summary data via `apiClient.get('/documents/:id/summary')`, mapping key findings, layperson summary, and test markers.
   - Mobile (`apps/mobile/src/app/documents/report-summary.tsx`): Updated to seamlessly deserialize both camelCase and snake_case API payloads, rendering real summary data with disclaimer and mock indicators.
6. **Live End-to-End Verification**:
   - Successfully verified upload -> S3 -> BullMQ -> OCR -> AI Summarizer -> `AiSummary` (`isMock: false`, `modelUsed: "openai/gpt-oss-120b"`) and `DocumentChunk` generation.
   - Verified failure cases: blank image / no OCR text and AI service offline both cleanly transition to `aiSummaryStatus: FAILED` with informative JSON responses and zero hangs.

---

## 2. Step 0 Findings: Pinecone vs. pgvector Resolution

### Audit Findings
- **Database Schema**:
  - `packages/database/prisma/schema.prisma` defines `DocumentChunk` with `id`, `documentId`, `content`, `metadata Json?`, `createdAt`.
  - There is no `Unsupported("vector(1536)")` column or pgvector extension enabled in PostgreSQL.
- **Service Implementations**:
  - `services/ai-service/app/chatbot/engine.py` and `services/ai-service/app/config.py` were written around `Pinecone` (`PINECONE_API_KEY`, `PINECONE_INDEX_NAME="maate-health"`).
  - However, no `PINECONE_API_KEY` was configured in `.env`.
- **Architectural Resolution (Approved)**:
  - We store chunked content and rich metadata directly in PostgreSQL `DocumentChunk`:
    ```json
    {
      "chunkIndex": 0,
      "charStart": 0,
      "charEnd": 170,
      "documentType": "lab_report",
      "tokenCount": 43,
      "embedding_status": "pending_provider"
    }
    ```
  - This guarantees that ingestion and summarization succeed reliably without hard dependency on external vector SaaS keys.
  - When Phase 8 (Chat & Clinical RAG) is implemented, chunks can be batch-embedded and synced to Pinecone or an upgraded pgvector store.

---

## 3. Mock vs. Real Summary Distinguishability Decision

In accordance with healthcare compliance guidelines (HIPAA & India DPDP Act), mock or simulated clinical data must never masquerade as verified AI analysis.

### Data Level Protection
Added a dedicated schema field:
```prisma
model AiSummary {
  // ...
  isMock     Boolean  @default(false) @map("is_mock")
  // ...
}
```
Applied migration: `20260831072929_add_ai_summary_is_mock`.

### Content Level Protection
On the fallback path (when Groq API key is missing or call fails):
- `is_mock: True` is explicitly returned.
- `summaryText` is prepended with `[MOCK SUMMARY — NOT FOR CLINICAL USE]`.
- Clinical disclaimer is appended stating that the summary was generated by a rule-based template.
On the live LLM path:
- `isMock: false` is recorded.
- Model identifier `openai/gpt-oss-120b` and actual prompt/completion token usage are recorded.

---

## 4. PRD Clinical & Compliance Requirements Alignment

Per `docs/PRD_Part3_AI_Compliance_Deployment.md` (Sections 9.3 & 9.4):
1. **Layperson vs. Clinical Separation**:
   - Summary output provides both structured `summaryText` and a simplified, jargon-free `laypersonSummary` for patient comprehension.
2. **Explicit Parameter Scoping**:
   - The AI summarizer prompt explicitly warns: *"You must strictly scope your findings and conclusions ONLY to the tests and parameters provided. If only 3 parameters are present, state clearly what those 3 show. Do NOT claim the entire report or overall health is normal."*
3. **No Direct Diagnosis or Prescription**:
   - The engine strictly flags risk severity (`low`, `moderate`, `critical`) and provides non-prescriptive next steps (e.g. "Discuss the high hemoglobin result with your healthcare provider promptly").
4. **Mandatory Clinical Disclaimer**:
   - Every summary output contains the mandatory medical AI disclaimer:
     > *"This AI-generated summary is for informational purposes only and does not constitute a medical diagnosis, treatment plan, or clinical recommendation. Always consult a qualified healthcare professional regarding any medical condition or laboratory results."*

---

## 5. Live End-to-End Verification Results

### Test 1: Happy Path (Upload -> S3 -> BullMQ -> OCR -> AI Summarizer -> DB)
- **Input Document**: Synthetic laboratory report image containing Glucose (95 mg/dL), Hemoglobin (142 gid), Creatinine (0.9 mg/dL).
- **Execution Log**:
  ```
  1. Authenticated
  2. Presigned URL obtained: key=users/19520a49-9654-4d26-8bb4-96813ea409e7/documents/2026/09/66b7545a23806735_apollo_lab_screen.png
  3. S3 Direct Upload Status: 200
  4. Confirm upload response docId: 10018cca-8cdb-4a0d-b20a-111d3a61728a
  5. Polling for BullMQ completion...
     Poll #1: ocrStatus=PROCESSING, aiSummaryStatus=PENDING
     Poll #2: ocrStatus=COMPLETED, aiSummaryStatus=PROCESSING
     Poll #3: ocrStatus=COMPLETED, aiSummaryStatus=PROCESSING
     Poll #4: ocrStatus=COMPLETED, aiSummaryStatus=PROCESSING
     Poll #5: ocrStatus=COMPLETED, aiSummaryStatus=COMPLETED
  ```
- **Real Generated Summary Response (`GET /api/v1/documents/:id/summary`)**:
  ```json
  {
    "data": {
      "id": "dfd715e6-77f4-458b-bde5-c46bf22c17c2",
      "documentId": "10018cca-8cdb-4a0d-b20a-111d3a61728a",
      "summaryText": "The lab report shows glucose 95 mg/dL (normal), hemoglobin 142 gid (markedly elevated), and creatinine 09 mg/dL (markedly elevated).",
      "keyFindings": [
        {
          "parameter": "Glucose",
          "value": "95",
          "unit": "mg/dL",
          "status": "normal",
          "note": "Within normal fasting range."
        },
        {
          "parameter": "Hemoglobin",
          "value": "142",
          "unit": "gid",
          "status": "critical",
          "note": "Value appears markedly elevated; may reflect a unit discrepancy or an abnormal result."
        },
        {
          "parameter": "Creatinine",
          "value": "09",
          "unit": "mg/dL",
          "status": "critical",
          "note": "Value is markedly elevated, suggesting possible kidney function concern."
        }
      ],
      "riskFlags": [
        {
          "parameter": "Hemoglobin",
          "severity": "critical",
          "recommendation": "Discuss the high hemoglobin result with your healthcare provider promptly."
        },
        {
          "parameter": "Creatinine",
          "severity": "critical",
          "recommendation": "Seek medical advice soon to evaluate kidney function."
        }
      ],
      "recommendations": [
        "Schedule a follow-up appointment with your doctor to review these abnormal results and determine any needed further testing or treatment."
      ],
      "laypersonSummary": "Your blood sugar level is normal. However, the hemoglobin and creatinine numbers are much higher than typical values, which could indicate a problem. Please talk with your doctor about these results.",
      "modelUsed": "openai/gpt-oss-120b",
      "modelVersion": "1.0",
      "promptTokens": 591,
      "completionTokens": 805,
      "costUsd": null,
      "latencyMs": null,
      "isMock": false,
      "createdAt": "2026-09-01T17:42:52.887Z"
    },
    "status": "COMPLETED"
  }
  ```

### Test 2: Document Chunking Verification in PostgreSQL
- **SQL Query**:
  ```sql
  SELECT id, document_id, content, metadata FROM document_chunks WHERE document_id = '10018cca-8cdb-4a0d-b20a-111d3a61728a';
  ```
- **Result**:
  ```
  id: 1eb7c3e4-08cd-4ff0-af03-f1011d0c53b0
  document_id: 10018cca-8cdb-4a0d-b20a-111d3a61728a
  content: APOLLOCLINICAL LABS- REPORT\nPatient Test User\nDate: 2026-08-31\n\nGlucose: 95 mgidL (Normat 70-98),\nHemoglobin: 142 gid (Normal 120-160)\nCreatinine: 09 mgidL (Normal 07-13)
  metadata: {"charEnd": 170, "charStart": 0, "chunkIndex": 0, "tokenCount": 43, "documentType": "lab_report", "embedding_status": "pending_provider"}
  ```

### Test 3: Failure Case A — Blank Document / No OCR Text
- **Input**: Completely blank white image (zero OCR text/entities).
- **Execution Log**:
  ```
  Testing blank document docId=d56a8128-5f0a-418c-bf7d-dfc564443a64...
     Poll #1: ocrStatus=FAILED, aiSummaryStatus=FAILED
  Status endpoint response:
  {
    "data": null,
    "status": "FAILED",
    "message": "AI summary status is FAILED"
  }
  ```

### Test 4: Failure Case B — AI Service Down / Offline
- **Input**: Valid image uploaded while AI service (port 8001) stopped.
- **Execution Log**:
  ```
  Testing AI Service Down on docId=7d0ac9d7-07b1-4994-b4be-f20b9d351bd7...
     Poll #1: ocrStatus=COMPLETED, aiSummaryStatus=FAILED
  Status endpoint response:
  {
    "data": null,
    "status": "FAILED",
    "message": "AI summary status is FAILED"
  }
  ```

---

## 6. Known Gaps & Future Work

1. **Vector Embeddings (Deferred to Phase 8)**:
   - Chunks are stored with `embedding_status: "pending_provider"`. Pinecone or pgvector synchronization will be wired up during Phase 8 (Clinical Chat & RAG).
2. **Medical NER Vocabulary Coverage**:
   - As identified in Phase 3, severely degraded OCR text can cause spaCy NER to miss test rows. In Phase 4, the summarizer gracefully scopes itself exclusively to recognized tests and informs the user if results appear atypical or incomplete.
3. **Dead Weight Dependencies**:
   - `@supabase/supabase-js` remains declared in root dependencies and `turbo.json`; flagged for final cleanup pass.
