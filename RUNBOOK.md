# MAATE Local Development Runbook (Phase 1 Baseline)

This runbook provides step-by-step instructions to boot, migrate, seed, and run the entire MAATE monorepo locally with real data flowing between services.

---

## 1. Prerequisites & Environment Setup

### 1.1 System Dependencies
- **Node.js**: `>= 20.17.0` (Node 22 recommended)
- **pnpm**: `>= 9.15.0` (`npm install -g pnpm`)
- **Python**: `3.11.x`
- **Container Engine**: Docker Desktop or OrbStack (for containerized stack), or native Homebrew PostgreSQL 16+ and Redis 7+.

---

## 2. Step-by-Step Local Stack Startup

### Step 1: Clone and Install Dependencies
```bash
# Clone the repository
git clone <repo-url>
cd Maate

# Install all monorepo dependencies across workspace packages
pnpm install
```

---

### Step 2: Configure Local Environment Files

Copy all `.env.example` files to their active local configuration targets:

```bash
# 1. Root configuration
cp .env.example .env

# 2. Database package configuration (Prisma migrations)
echo 'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/maate_dev"' > packages/database/.env

# 3. Backend NestJS API
cp apps/api/.env.example apps/api/.env.local

# 4. Web Frontend (Next.js)
cp apps/web/.env.example apps/web/.env.local

# 5. Mobile Frontend (Expo)
echo 'EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1' > apps/mobile/.env.local

# 6. Python AI Service
cp services/ai-service/.env.example services/ai-service/.env

# 7. Python OCR Service
cp services/ocr-service/.env.example services/ocr-service/.env
```

> [!IMPORTANT]
> All `.env`, `.env.local`, and `.env.*` files are strictly excluded by the root `.gitignore` to prevent secret leaks.

---

### Step 3: Start Infrastructure (Docker Compose)

```bash
# Start PostgreSQL, Redis, MinIO, AI Service, OCR Service, and BullMQ Dashboard
docker compose up -d

# Verify container health status
docker compose ps
```

*Default Container Port Mappings:*
- **PostgreSQL**: `localhost:5432` (`postgres:postgres`, DB `maate_dev`)
- **Redis**: `localhost:6379` (DB 0: API/BullMQ, DB 1: OCR, DB 2: AI)
- **MinIO S3**: `localhost:9000` (API) & `localhost:9001` (Web Console `minioadmin:minioadmin123`)
- **AI Service**: `localhost:8001`
- **OCR Service**: `localhost:8002`
- **BullMQ Dashboard**: `localhost:3200`

*(Note: On local machines running PostgreSQL and Redis natively via Homebrew, ensure the `maate_dev` database exists: `createdb maate_dev`)*.

---

### Step 4: Run Database Migrations & Seed

```bash
# 1. Generate Prisma Client
pnpm db:generate

# 2. Apply Prisma migrations
pnpm db:migrate

# 3. Populate development database with sample seed data
pnpm db:seed
```

#### What the Seed Script Creates:
- **`User` (1 row)**: Priya Sharma (`priya@example.com`, `+919876543210`)
- **`WaterReminder` (1 row)**: 2500ml daily goal (90-min interval, 250ml glass)
- **`MedicineReminder` (3 rows)**: Metformin 500mg, Amlodipine 5mg, Atorvastatin 10mg
- **`MealReminder` (3 rows)**: Breakfast (08:00), Lunch (13:00), Dinner (19:30)

---

### Step 5: Start Application Services

Run each application in separate terminal tabs or background tasks:

```bash
# Terminal 1: Backend NestJS API (Port 3000)
pnpm --filter @maate/api dev

# Terminal 2: Web Frontend (Port 3001)
pnpm --filter @maate/web dev

# Terminal 3: Mobile App (Expo Metro on Port 8081)
pnpm --filter @maate/mobile dev
```

---

## 3. End-to-End Verification & Health Checks

### 3.1 Backend Health Check
```bash
curl -s http://localhost:3000/api/v1/health | jq .
```
**Expected Response**:
```json
{
  "status": "healthy",
  "services": {
    "database": { "status": "up", "seededUsers": 8 },
    "redis": { "status": "up" }
  }
}
```

### 3.2 Swagger Interactive Documentation
Open `http://localhost:3000/api/docs` in your browser.

### 3.3 End-to-End Seeded User OTP Flow
```bash
# 1. Request OTP for seeded user
curl -s -X POST http://localhost:3000/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"priya@example.com"}'

# 2. Fetch development OTP from memory/Redis
OTP=$(curl -s "http://localhost:3000/api/v1/auth/dev/last-otp?email=priya@example.com" | jq -r .otp)

# 3. Verify OTP and obtain JWT tokens
curl -s -X POST http://localhost:3000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"priya@example.com\",\"otp\":\"$OTP\"}" | jq .
```

### 3.4 Web Application Verification
- Open `http://localhost:3001/` (Automatically redirects to `/dashboard`).
- Open `http://localhost:3001/login` to access authentication views.

### 3.5 Python Microservices Direct Health
- **AI Service**: `curl -s http://localhost:8001/health` (Returns `{"status":"healthy","service":"ai-service"}`)
- **OCR Service**: `curl -s http://localhost:8002/health` (Returns `{"status":"healthy","service":"ocr-service"}`)

---

## 4. Required API Keys & Placeholders

| Environment Variable | Target Location | Default State | Impact When Missing |
| :--- | :--- | :--- | :--- |
| **`OPENAI_API_KEY`** | `services/ai-service/.env` and `.env` | `""` (Empty) | **Required for Phase 4 (AI Summarization & Chat)**. When empty, `SummarizerEngine` returns development mock summary objects. When an invalid key is supplied, OpenAI returns an expected `401 Unauthorized (invalid_api_key)` error. |
| **`GOOGLE_CLIENT_ID`** | `apps/api/.env.local` | `""` (Empty) | Google social login button on Web/Mobile is disabled or rejected. |
| **`GOOGLE_VISION_API_KEY`** | `services/ocr-service/.env` | `""` (Empty) | Service falls back to local Tesseract OCR engine. |
| **`PINECONE_API_KEY`** | `services/ai-service/.env` | `""` (Empty) | Vector search / RAG context retrieval falls back to direct database records. |
| **`SMTP_USER` / `SMTP_PASS`** | `apps/api/.env.local` | `""` (Empty) | Email OTP and notification delivery operates in local dev mode (OTPs accessible via `/api/v1/auth/dev/last-otp`). |

---

## 5. Summary of Phase 0 & Phase 1 Refactorings

### 5.1 Shared Types Integration (Step 0)
1. **Added Dependency**: Added `"@maate/shared-types": "workspace:*"` to `apps/web/package.json`.
2. **Type Deduplication**:
   - `apps/web/src/store/use-auth-store.ts`: Replaced local interfaces with imported `UserProfile` and `FamilyMemberResponse` types.
   - `apps/web/src/hooks/use-upload.ts`: Replaced raw string document types with `DocumentTypeEnum` imported from `@maate/shared-types`.
3. **Enum Normalization**: Added `DOCTOR_NOTE`, `REFERRAL`, and `CONSENT_FORM` to `DocumentTypeEnum` in `packages/shared-types/src/index.ts` to match Prisma `DocumentType` enum.
4. **Validation**: All workspace packages pass build and typecheck with `100% PASS` (`7/7 packages successful`).

---

## 6. Known Incomplete Pieces & Implementation Gaps (Phase 1 Baseline)

1. **`apps/api/src/modules/share` (Doctor Sharing)**:
   - Contains only an empty `@Module({}) export class ShareModule {}`. Missing controller, service, and DTOs (scheduled for Phase 7).
2. **Seed Data Model Coverage (35 skipped models)**:
   - `seed.ts` only populates 4 models (`User`, `WaterReminder`, `MedicineReminder`, `MealReminder`).
   - The remaining 35 models (`Document`, `LabReport`, `VitalSign`, `TimelineEvent`, `ChronicCondition`, `FamilyMember`, `DoctorShare`, etc.) have 0 rows seeded in local development. As a result, endpoints like `GET /api/v1/documents`, `GET /api/v1/timeline`, and `GET /api/v1/analytics/dashboard` return empty arrays `[]` until records are created via user actions or Phase-specific seeds.
3. **Mobile Screen Mock States**:
   - `/notifications` and `/settings` in `apps/mobile` display static UI elements with mock state rather than connecting to live API controllers.
4. **Container Engine on Host**:
   - Docker Desktop / daemon was not present on host during Phase 1 audit. PostgreSQL and Redis were operated natively via Homebrew services on ports 5432 and 6379. To spin up containerized MinIO, Python OCR, and Python AI services via Docker Compose, Docker Desktop or OrbStack must be running.
