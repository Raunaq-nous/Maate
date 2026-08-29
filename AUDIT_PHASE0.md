# MAATE Monorepo — Phase 0 Cleanup & Technical Audit Report

**Date**: August 2026  
**Auditor**: Antigravity AI Engineering Assistant  
**Repository Structure**: Monorepo managed via `pnpm` + `Turborepo`  

---

## 1. Dead Code Decommissioning (`apps/ai-service`)

### Action Taken
`apps/ai-service` was **completely deleted** from the repository.

### Verification Performed Prior to Deletion
1. **Repository Import Grep**: Verified across all packages and apps that no file imported from or referenced `apps/ai-service`.
2. **Infrastructure Configurations**: Confirmed that `docker-compose.yml`, `docker-compose.prod.yml`, and `turbo.json` exclusively route to the active standalone services:
   - `services/ai-service` (Python 3.11 / FastAPI + LangChain + OpenAI + Pinecone RAG)
   - `services/ocr-service` (Python 3.11 / FastAPI + Tesseract OCR + OpenCV + spaCy NER)
3. **Workspace Config**: Confirmed `pnpm-workspace.yaml` uses glob `apps/*` and `services/*`, cleanly accommodating the removal without config edits.

---

## 2. Module Completeness Audit

### 2.1 Backend API Modules (`apps/api/src/modules/`)

| Module | File Count | Controller | Service | Module File | DTOs | Test Files | Status / Completeness Notes |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **`auth`** | 10 | Yes (`auth.controller.ts`) | Yes (`auth.service.ts` + 4 specialized services: `oauth`, `otp`, `password`, `token`) | Yes | Yes (3 files: `auth.dto.ts`, `send-otp.dto.ts`, `index.ts`) | None | Complete implementation for email/phone/Google auth & OTP. |
| **`chat`** | 3 | Yes (`chat.controller.ts`) | Yes (`chat.service.ts`) | Yes | No (Inline types) | None | Functional proxy to `services/ai-service` with session persistence. |
| **`document`** | 4 | Yes (`document.controller.ts`) | Yes (`document.service.ts`) | Yes | Yes (`document.dto.ts`) | None | Handles upload initiation, presigned S3 URLs, OCR trigger, and metadata. |
| **`family`** | 3 | Yes (`family.controller.ts`) | Yes (`family.service.ts`) | Yes | No (Inline types) | None | Implements `FamilyMember` and `AccessPermission` management. |
| **`health`** | 3 | Yes (`analytics.controller.ts`) | Yes (`analytics.service.ts`) | Yes (`health.module.ts`) | No | None | Computes health scores, adherence rates, hydration, and lab parameter trends. |
| **`notification`**| 5 | Yes (`notification.controller.ts`)| Yes (`notification.service.ts`, `mail.service.ts`, `notification.processor.ts`) | Yes | No | None | BullMQ queue processor, in-app notifications, and Nodemailer email delivery. |
| **`reminder`** | 4 | Yes (`reminder.controller.ts`) | Yes (`reminder-scheduler.service.ts`, `reminder.processor.ts`) | Yes | No | None | Cron scheduler and BullMQ processor for medicine, water, and meal reminders. |
| **`share`** | 1 | **No** | **No** | Yes (`share.module.ts`) | **No** | None | **Empty shell**. Only contains an empty `@Module({}) export class ShareModule {}`. |
| **`timeline`** | 3 | Yes (`timeline.controller.ts`) | Yes (`timeline.service.ts`) | Yes | No (Empty `dto/` directory) | None | Read-optimized health event timeline aggregator with Redis caching. |
| **`user`** | 3 | Yes (`user.controller.ts`) | Yes (`user.service.ts`) | Yes | No | None | User profile retrieval, update, and account status management. |

> **API Testing Coverage Gap**: Across the entire `apps/api` workspace, **0 test or spec files** currently exist.

---

### 2.2 Deep Dive: `apps/api/src/modules/share` vs. `DoctorShare` Model

The `DoctorShare` Prisma schema defines a secure medical record sharing feature:
- **Schema Fields**: `id`, `userId`, `shareToken`, `doctorName`, `doctorEmail`, `doctorPhone`, `accessLevel`, `sharedResources` (array of resources like lab reports, prescriptions), `expiresAt`, `isRevoked`, `accessedCount`, `lastAccessed`, `createdAt`.

**What is present**:
- `apps/api/src/modules/share/share.module.ts` (Empty NestJS module class).

**What is completely missing**:
1. **Controllers & Endpoints**:
   - `POST /share/doctor` — Generate a secure, time-bound doctor access token.
   - `GET /share/doctor/:token` — Public/token-authenticated view for doctors to inspect shared health records without creating an account.
   - `GET /share` — List all active shares created by the authenticated patient.
   - `DELETE /share/:id` or `PATCH /share/:id/revoke` — Revoke doctor access immediately.
2. **Service Layer**:
   - Token generation (crypto-secure 64-character token).
   - Expiration validation, revocation checks, access count incrementation, and audit logging (`lastAccessed`).
   - Resource access filtering (filtering lab reports, imaging, medications based on `sharedResources`).
3. **DTOs & Validation**:
   - `CreateDoctorShareDto`, `RevokeShareDto`, `ShareResponseDto`.

---

### 2.3 Frontend Route Shell vs. Real Implementation Audit

#### Web Application (`apps/web/src/app`)
- **Shells & Redirects**:
  - `/` (`app/page.tsx`) — Lightweight client/server redirect to `/dashboard`.
- **Real Implementations (13 pages)**:
  - `/(auth)/login/page.tsx` — Full login form with validation, credentials, phone OTP, and Google login.
  - `/(auth)/register/page.tsx` — Multi-step registration form with profile and demographic fields.
  - `/(auth)/verify-otp/page.tsx` — 6-digit OTP input grid, countdown timer, resend trigger.
  - `/(dashboard)/dashboard/page.tsx` — Full dashboard with vitals cards, AI insights widget, medication widget, quick actions.
  - `/(dashboard)/records/page.tsx` — Document management grid/table with category filters and search.
  - `/(dashboard)/chat/page.tsx` — Interactive medical chat assistant with session history and context selection.
  - `/(dashboard)/family/page.tsx` — Family member directory, add member modal, relationship tags.
  - `/(dashboard)/family/permissions/page.tsx` — Granular permission matrix for family profiles.
  - `/(dashboard)/profile/page.tsx` — User profile editor, baseline vitals, DPDP consents, and MFA toggles.
  - `/(dashboard)/reminders/page.tsx` — Reminder manager for medicines, hydration, and meals with interactive schedule.
  - `/(dashboard)/reports/upload/page.tsx` — File dropzone, upload progress tracker, and file validation.
  - `/(dashboard)/reports/review/page.tsx` — OCR extraction review and correction interface.
  - `/(dashboard)/reports/[id]/page.tsx` — Detailed medical report viewer, parameter tables, and AI summary.

#### Mobile Application (`apps/mobile/src/app`)
- **Shells & Mock UIs**:
  - `/notifications/index.tsx` — Static hardcoded notification items; not connected to API/store.
  - `/settings/index.tsx` — Local React state only; toggle preferences are not synced to backend or persisted.
  - `/(tabs)/profile.tsx` — Hardcoded profile card; edit and logout action buttons are stubs.
- **Store-Connected Implementations (10 screens)**:
  - `/(auth)/login.tsx` & `/(auth)/onboarding.tsx` — Connected to `useAuthStore` and AsyncStorage.
  - `/(tabs)/home.tsx` — Connected to auth and document stores with real greeting, widgets, and action dispatchers.
  - `/(tabs)/timeline.tsx` — Connected to `timelineStore` for health history feed.
  - `/(tabs)/reminders.tsx` — Connected to reminder store with adherence tracking.
  - `/(tabs)/chat.tsx` — Connected to `chatStore` with session management and message streaming.
  - `/analytics/index.tsx` — Connected to `analyticsStore` for vitals trends and health scoring.
  - `/family/index.tsx` — Connected to `familyStore` for family group operations.
  - `/documents/upload.tsx`, `ocr-review.tsx`, `prescription-review.tsx`, `report-summary.tsx`, `report.tsx` — Connected to `documentStore` with full upload, OCR extraction, and preview flows.

---

## 3. Schema vs. Code Consistency Check

The Prisma schema (`packages/database/prisma/schema.prisma`) defines **39 models**.

### 3.1 Model Usage Across Backend & Frontend

| Model Name | `apps/api` Prisma Usage | `apps/web` Referenced | `apps/mobile` Referenced |
| :--- | :---: | :---: | :---: |
| **`User`** | Used (`auth`, `oauth`, `password`, `family`, `user`) | Yes | Yes |
| **`OAuthAccount`** | Used (`oauth.service.ts`) | No | No |
| **`RefreshToken`** | Used (`password.service.ts`) | No | No |
| **`UserSession`** | Used (`auth`, `oauth`) | No | No |
| **`PasswordReset`** | Used (`password.service.ts`) | No | No |
| **`Document`** | Used (`document`, `timeline`, `file-processing`) | Yes | Yes |
| **`OcrResult`** | Used (`document`, `file-processing`) | No | No |
| **`AiSummary`** | Used (`document`, `file-processing`) | No | No |
| **`LabReport`** | **ZERO USAGE** (Indirectly included via `labParameter`) | No | No |
| **`LabParameter`** | Used (`analytics.service.ts`) | No | No |
| **`ImagingReport`** | **ZERO USAGE** | No | No |
| **`Medication`** | **ZERO USAGE** | Yes | Yes |
| **`MedicationInteraction`** | **ZERO USAGE** | No | No |
| **`Prescription`** | **ZERO USAGE** | No | Yes |
| **`VitalSign`** | Used (`analytics.service.ts`) | No | No |
| **`SymptomEntry`** | **ZERO USAGE** | No | No |
| **`ChronicCondition`** | **ZERO USAGE** | No | No |
| **`HealthRecord`** | **ZERO USAGE** | No | No |
| **`TimelineEvent`** | Used (`timeline.service.ts`) | Yes | Yes |
| **`DoctorNote`** | **ZERO USAGE** | No | No |
| **`MedicineReminder`** | Used (`reminder.controller`, `reminder-scheduler`) | No | No |
| **`WaterReminder`** | Used (`reminder.controller.ts`) | No | No |
| **`MealReminder`** | Used (`reminder.controller`, `reminder-scheduler`) | No | No |
| **`ReminderLog`** | Used (`analytics`, `reminder.controller`, `reminder.processor`) | No | No |
| **`FamilyGroup`** | **ZERO USAGE** | No | No |
| **`FamilyGroupMember`** | **ZERO USAGE** | No | No |
| **`DoctorShare`** | **ZERO USAGE** | No | No |
| **`ChatSession`** | Used (`chat.service.ts`) | Yes | No |
| **`ChatMessage`** | Used (`chat.service.ts`) | No | Yes |
| **`Notification`** | Used (`notification.controller`, `notification.service`, `notification.processor`)| Yes | Yes |
| **`AuditLog`** | Used (`audit.service.ts`, `auth.service.ts`) | No | No |
| **`FileUpload`** | Used (`file-processing.service.ts`) | No | No |
| **`DataExportRequest`** | **ZERO USAGE** | No | No |
| **`DocumentChunk`** | **ZERO USAGE** | No | No |
| **`UserDevice`** | Used (`notification.service`, `notification.processor`) | No | No |
| **`DataConsent`** | **ZERO USAGE** | No | No |
| **`UserMfa`** | **ZERO USAGE** | No | No |
| **`FamilyMember`** | Used (`family.service.ts`, `jwt-auth.guard.ts`) | No | Yes |
| **`AccessPermission`** | Used (`family.service.ts`, `jwt-auth.guard.ts`) | No | No |

---

### 3.2 Key Gaps in Schema Usage

1. **16 Models with Zero Usage in API Layer**:
   - **Clinical / EHR Core**: `LabReport`, `ImagingReport`, `Medication`, `MedicationInteraction`, `Prescription`, `SymptomEntry`, `ChronicCondition`, `HealthRecord`, `DoctorNote`.
   - **Sharing & Collaboration**: `DoctorShare`, `FamilyGroup`, `FamilyGroupMember` (Note: API uses `FamilyMember` + `AccessPermission` model instead of `FamilyGroup`).
   - **RAG & Search**: `DocumentChunk` (Intended for pgvector vector store chunks).
   - **Compliance & Security**: `DataConsent` (DPDP compliance tracking), `UserMfa` (TOTP MFA), `DataExportRequest` (GDPR/DPDP data export requests).

2. **Clinical UI Surface Mismatch**:
   - `SymptomEntry`, `ChronicCondition`, `MedicationInteraction`, `ImagingReport`, and `DoctorNote` have **zero representation** in both Web and Mobile UIs.
   - `VitalSign` is visualized in the Web and Mobile UIs, but on Mobile relies on mock generators rather than live API queries.
   - `Medication` is rendered in Web dashboard widgets and Mobile reminders, but without dedicated backend medication catalog CRUD.

---

## 4. Environment & Configuration Inventory

### 4.1 Master Environment Variable Inventory

| Variable Name | `apps/api` | `apps/web` | `services/ai-service` | `services/ocr-service` | Purpose |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `NODE_ENV` | Yes | Yes | — | — | Node runtime environment (`development`, `production`, `test`) |
| `APP_PORT` | Yes | — | — | — | Port on which the API server listens |
| `LOG_LEVEL` | Yes | — | Yes | Yes | Logging level (`debug`, `info`, `warn`, `error`) |
| `USE_PINO_PRETTY` | Yes | — | — | — | Flag to enable pretty-printed pino logs in local dev |
| `CORS_ORIGINS` | Yes | — | — | — | Comma-separated list of allowed CORS origins |
| `DATABASE_URL` | Yes | — | Yes | — | PostgreSQL connection URI for Prisma / direct DB access |
| `JWT_SECRET` | Yes | — | — | — | HMAC secret for signing authentication JWTs |
| `JWT_ACCESS_EXPIRY` | Yes | — | — | — | Access token lifetime string (`15m`) |
| `JWT_ACCESS_EXPIRY_SECONDS`| Yes | — | — | — | Access token lifetime numeric seconds (`900`) |
| `JWT_REFRESH_DAYS` | Yes | — | — | — | Refresh token lifetime in days (`30`) |
| `GOOGLE_CLIENT_ID` | Yes | — | — | — | Google OAuth 2.0 Client ID for social auth |
| `MAX_LOGIN_ATTEMPTS` | Yes | — | — | — | Maximum failed login attempts before lockout |
| `LOCKOUT_MINUTES` | Yes | — | — | — | Account lockout duration in minutes |
| `REDIS_HOST` | Yes | — | — | — | Redis server host |
| `REDIS_PORT` | Yes | — | — | — | Redis server port |
| `REDIS_PASSWORD` | Yes | — | — | — | Redis authentication password |
| `REDIS_DB` | Yes | — | — | — | Redis DB index for BullMQ queues |
| `REDIS_URL` | — | — | Yes | Yes | Full Redis connection URL for Python services |
| `S3_ENDPOINT` | Yes | — | — | Yes | S3 / MinIO storage endpoint URL |
| `S3_REGION` | Yes | — | — | — | S3 storage region |
| `S3_BUCKET` | Yes | — | — | Yes | S3 bucket name for document uploads |
| `S3_ACCESS_KEY_ID` / `S3_ACCESS_KEY` | Yes | — | — | Yes | S3 storage access key |
| `S3_SECRET_ACCESS_KEY` / `S3_SECRET_KEY` | Yes | — | — | Yes | S3 storage secret key |
| `S3_FORCE_PATH_STYLE` | Yes | — | — | — | Enable path-style S3 URLs for MinIO |
| `S3_KMS_KEY_ID` | Yes | — | — | — | Optional KMS key ID for SSE-KMS |
| `UPLOAD_URL_EXPIRY` | Yes | — | — | — | Presigned upload URL expiration in seconds |
| `DOWNLOAD_URL_EXPIRY` | Yes | — | — | — | Presigned download URL expiration in seconds |
| `MAX_FILE_SIZE_BYTES` | Yes | — | — | — | Max allowed document upload size in bytes |
| `AI_SERVICE_URL` | Yes | — | — | — | Internal URL of the AI summarization/chat service |
| `OCR_SERVICE_URL` | Yes | — | — | — | Internal URL of the OCR/NER processing service |
| `OPENAI_API_KEY` | — | — | Yes | — | OpenAI API key for GPT-4o inferences |
| `OPENAI_MODEL` | — | — | Yes | — | OpenAI model identifier (`gpt-4o`) |
| `OPENAI_TEMPERATURE` | — | — | Yes | — | Model temperature for deterministic extraction |
| `PINECONE_API_KEY` | — | — | Yes | — | Pinecone API key for RAG vector search |
| `PINECONE_INDEX` | — | — | Yes | — | Pinecone vector index name (`maate-health`) |
| `GOOGLE_VISION_API_KEY` | — | — | — | Yes | Fallback Google Cloud Vision API key |
| `TESSERACT_LANG` | — | — | — | Yes | Tesseract OCR language packs (`eng`, `hin+eng`) |
| `SMTP_HOST` | Yes | — | — | — | SMTP mail server hostname |
| `SMTP_PORT` | Yes | — | — | — | SMTP mail server port (`587`) |
| `SMTP_SECURE` | Yes | — | — | — | Enable TLS/SSL for SMTP (`false`) |
| `SMTP_USER` | Yes | — | — | — | SMTP authentication user |
| `SMTP_PASS` | Yes | — | — | — | SMTP authentication password |
| `SMTP_FROM` | Yes | — | — | — | Sender email address for notifications |
| `NEXT_PUBLIC_API_URL` | — | Yes | — | — | Backend API URL exposed to browser client |
| `NEXT_PUBLIC_AI_SERVICE_URL` | — | Yes | — | — | AI service URL for direct streaming client access |
| `NEXT_PUBLIC_SENTRY_DSN` | — | Yes | — | — | Sentry DSN for frontend crash reporting |
| `SENTRY_AUTH_TOKEN` | — | Yes | — | — | Sentry build-time auth token for source maps |
| `SENTRY_ORG` | — | Yes | — | — | Sentry organization identifier |
| `SENTRY_PROJECT` | — | Yes | — | — | Sentry project identifier |
| `ANALYZE` | — | Yes | — | — | Next.js bundle analyzer flag (`true`/`false`) |

### 4.2 Configuration Files Created in Phase 0
The following template files were created with placeholder values and descriptive inline documentation (no production secrets):
- `apps/api/.env.example`
- `services/ai-service/.env.example`
- `services/ocr-service/.env.example`

---

## 5. Dependency Sanity & Compatibility Audit

### 5.1 Monorepo Installation (`pnpm install`)
- **Result**: `0` errors. All 8 workspace packages resolved cleanly.
- **Lockfile Integrity**: `pnpm-lock.yaml` is fully up-to-date and consistent with workspace dependencies.

### 5.2 Python Virtual Environments (Python 3.11)
- **`services/ai-service/requirements.txt`**: Successfully installed in a clean Python 3.11 virtual environment with `0` dependency conflicts. (FastAPI `0.115.0`, LangChain `0.3.0`, OpenAI `1.55.0`, Pinecone `5.0.0`, Redis `5.2.0`).
- **`services/ocr-service/requirements.txt`**: Successfully installed in a clean Python 3.11 virtual environment with `0` dependency conflicts. (Tesseract `0.3.13`, Pillow `11.0.0`, OpenCV `4.10.0`, spaCy `3.8.0`, pdfplumber `0.11.0`, Boto3 `1.35.0`).

### 5.3 Shared Dependency Version Alignment

| Dependency | `apps/api` | `apps/web` | `apps/mobile` | Status |
| :--- | :---: | :---: | :---: | :--- |
| **`react`** | — | `19.0.0-rc-66855b96` | `18.3.1` | **Intentional Mismatch**: Web uses Next.js 15 / React 19 RC; Mobile uses React 18 for React Native / Expo SDK 52 compatibility. |
| **`@types/react`** | — | `^18.3.0` | `~18.3.0` | **Minor Note**: Web is on React 19 RC but typing package is currently pinned to v18. |
| **`@types/node`** | `^22.10.0` | `^20.17.0` | — | Compatible; matches respective server runtime targets. |
| **`axios`** | `^1.7.9` | `^1.7.0` | `^1.7.0` | Aligned (v1.x). |
| **`date-fns`** | `^4.1.0` | `^4.1.0` | `^4.1.0` | Aligned (v4.x). |
| **`@tanstack/react-query`**| — | `^5.60.0` | `^5.60.0` | Aligned (v5.x). |
| **`zustand`** | — | `^5.0.1` | `^5.0.0` | Aligned (v5.x). |
| **`tailwindcss`** | — | `^3.4.14` | `^3.4.0` | Aligned (v3.x). |
| **`typescript`** | `^5.6.0` | `^5.6.3` | `^5.6.0` | Aligned (v5.6.x). |
| **`@maate/shared-types`** | `workspace:*` | *Not listed* | `workspace:*` | **Gap**: `apps/web` manages local types rather than importing `@maate/shared-types`. |

---

## 6. Baseline Build & Typecheck Check

### 6.1 Results Summary

```bash
pnpm turbo run build
Tasks: 5 successful, 5 total (100% PASS)

pnpm turbo run typecheck --force
Tasks: 6 successful, 6 total (100% PASS)
```

### 6.2 Categorized Diagnostic Findings

1. **`@maate/web` Build & Typecheck**:
   - **Build**: PASSED (16 static/dynamic routes compiled).
   - **Typecheck**: PASSED (0 TypeScript errors).
   - **Configuration Warning**:
     ```text
     ⚠ Invalid next.config.js options detected:
     ⚠     Unrecognized key(s) in object: 'sentry'
     ```
     *Reason*: Next.js 15 deprecated top-level `sentry` options in `next.config.js`; Sentry options should be passed via `withSentryConfig(config, sentryWebpackPluginOptions, sentryOptions)`.

2. **`@maate/mobile` Build & Typecheck**:
   - **Build**: PASSED (`echo 'Use EAS Build for production'`).
   - **Typecheck**: PASSED (0 TypeScript errors).
   - **Turbo Warning**: `WARNING no output files found for task @maate/mobile#build` (expected since EAS builds mobile binaries in CI/cloud).

3. **`@maate/api` Build & Typecheck**:
   - **Build**: PASSED (NestJS CLI build succeeded).
   - **Typecheck**: PASSED (0 TypeScript errors).

4. **`@maate/database` & `@maate/shared-types`**:
   - **Build**: PASSED (tsup CJS + ESM bundled).
   - **Typecheck**: PASSED.

---

## 7. Git Hygiene & Scratch Scripts

### 7.1 `.gitignore` Hygiene
- Updated root `.gitignore` to globally exclude:
  - `node_modules/`, `.pnpm-store/`
  - `.env`, `.env.*` (safely whitelisting `!.env.example` and `!.env.production.template`)
  - `dist/`, `build/`, `.next/`, `out/`, `*.tsbuildinfo`
  - `.expo/`, `apps/mobile/ios/`, `apps/mobile/android/`
  - `__pycache__/`, `*.py[cod]`, `venv/`, `.venv/`, `.pytest_cache/`
  - `.turbo/`, `coverage/`, `.nyc_output/`, `*.lcov`, `*.log`

### 7.2 Database Scratch Scripts Audit
- Inspected `packages/database/scratch/`:
  - `check-user.ts` (Manual user lookup test script).
  - `delete-user.ts` (Manual user deletion test script).
- **Confirmation**: Confirmed neither script is imported anywhere in the monorepo codebase.
- **Action Taken**: Added `packages/database/scratch/README.md` clearly documenting them as developer-only local debugging utilities.

---

## 8. Known Gaps & Strategic Priorities Going into Phase 1

1. **Implement Missing `DoctorShare` Module**:
   - `apps/api/src/modules/share` is currently an empty shell. Need to implement controller endpoints, token verification service, and doctor access views.
2. **Bridge Prisma Schema to API Domain Services**:
   - 16 models in the Prisma schema have zero API read/write integration. Priorities for Phase 1 include:
     - Direct `LabReport` & `ImagingReport` CRUD and ingestion pipelines.
     - `Medication` & `Prescription` domain services.
     - `VitalSign` and `SymptomEntry` logging endpoints for mobile syncing.
     - DPDP `DataConsent` logging integration.
3. **Connect Mobile Mock UIs to Live State**:
   - `/notifications` and `/settings` on Mobile currently use hardcoded / local React state. Wire them to the backend notification and user preferences endpoints.
4. **Establish API Unit & Integration Test Suite**:
   - Set up Jest / Supertest test harnesses in `apps/api` for auth, document ingestion, and reminder scheduling.
5. **Normalize Shared Types in Web**:
   - Add `@maate/shared-types` as a dependency in `apps/web/package.json` to eliminate duplicate interface definitions across web and API.
6. **Clean Next.js Sentry Config**:
   - Update `apps/web/next.config.js` to conform to Next.js 15 Sentry plugin specifications.
