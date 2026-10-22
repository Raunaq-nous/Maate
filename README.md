# Maate — AI-Powered Personal Health Management Platform

<div align="center">

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Live%20Demo-black?style=for-the-badge&logo=vercel)](https://maate-web.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![NestJS](https://img.shields.io/badge/NestJS-10.0-E0234E?style=for-the-badge&logo=nestjs)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Turborepo](https://img.shields.io/badge/Turborepo-Monorepo-EF4444?style=for-the-badge&logo=turborepo)](https://turbo.build/)
[![Compliance](https://img.shields.io/badge/Compliance-HIPAA%20%7C%20DPDP-teal?style=for-the-badge)](https://maate-web.vercel.app)

<br />

**[🚀 Explore the Live Web Application](https://maate-web.vercel.app)** &bull; **[Login Portal](https://maate-web.vercel.app/login)** &bull; **[Registration](https://maate-web.vercel.app/register)**

</div>

---

## 🌟 Overview

**Maate** is an enterprise-grade, HIPAA & DPDP-compliant personal health management platform designed for patients, families, and healthcare providers. It provides unified medical record aggregation, automated clinical report digitization (OCR), AI-driven clinical summarization, semantic record retrieval (RAG), and secure doctor-sharing portals with time-limited cryptographic access tokens.

---

## 🔗 Live Application

The Next.js 15.5 App Router web application is deployed to **Vercel**:

- **Production URL:** [https://maate-web.vercel.app](https://maate-web.vercel.app)
- **Direct Aliases:** [https://maate-web-haus-nous-6479s-projects.vercel.app](https://maate-web-haus-nous-6479s-projects.vercel.app)
- **Features Available in Live Preview:**
  - Modern Health Dashboard with clinical vital trendlines & health cards
  - Digital Document Management with real-time OCR status tracking
  - AI Conversational Assistant with semantic clinical query routing
  - Doctor Sharing Portal with secure tokenized URLs
  - DPDP & HIPAA Data Privacy Consent controls and account erasure mechanisms

---

## 🏗️ Architecture

```
Maate Monorepo (pnpm + Turborepo)
├── apps/
│   ├── web/                     # Next.js 15.5 (App Router), React 19, Tailwind CSS, TanStack Query
│   ├── api/                     # NestJS 10 REST API, BullMQ, Redis, Prisma, Swagger
│   └── mobile/                  # Expo (React Native) cross-platform mobile client
├── services/
│   ├── ai-service/              # Python FastAPI, Sentence-Transformers (bge-small), Groq LLM
│   └── ocr-service/             # Python FastAPI, Tesseract OCR, physiological safety guards
├── packages/
│   ├── database/                # Prisma schema, PostgreSQL migrations + pgvector extension
│   ├── shared-types/            # Shared TypeScript contracts and DTOs
│   ├── eslint-config/           # Monorepo ESLint presets
│   └── tsconfig/                # Strict TypeScript configuration
└── deploy/
    ├── docker-compose.staging.yml # Single-node staging stack with Caddy reverse proxy
    └── DEPLOY.md                # Infrastructure and staging runbook
```

---

## 🛡️ Security & Regulatory Compliance

- **DPDP & HIPAA Readiness:** Explicit, granular consent tracking (`AI_SUMMARIZATION`, `AI_CHAT`, `DATA_PROCESSING`) with default-off toggles during registration.
- **Data Erasure & Soft-Delete:** Automated cascade erasure across relational records (`timeline_events`, `refresh_tokens`, `notifications`) and object storage blobs.
- **PHI Audit Trail:** Comprehensive immutable access logs for patient record lookups, downloads, and emergency caregiver access.
- **Time-Limited Doctor Sharing:** Cryptographically signed, expiring tokenized view links with zero-retention clinician portals.
- **Strict Network Isolation:** Caddy automated TLS termination, Argon2 password hashing, and encrypted refresh token rotation.

---

## 🛠️ Local Development Quickstart

### Prerequisites
- Node.js `>= 20.0.0`
- `pnpm >= 9.0.0`
- Python `>= 3.10`
- Docker & Docker Compose

### 1. Clone the Repository
```bash
git clone https://github.com/Raunaq-nous/Maate.git
cd Maate
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Spin Up Local Services
```bash
# Starts PostgreSQL (pgvector) and Redis
docker compose up -d
```

### 4. Database Setup
```bash
pnpm --filter @maate/database db:migrate
pnpm --filter @maate/database db:seed
```

### 5. Start Development Servers
```bash
# Run web client
pnpm --filter @maate/web dev

# Run backend API
pnpm --filter @maate/api dev
```

---

## 📄 License
UNLICENSED &copy; 2026 Maate Health. All rights reserved.
