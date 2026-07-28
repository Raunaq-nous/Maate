# Maate PRD — Part 3: AI Architecture, Compliance, Monetization & Deployment

## 9. AI/ML Architecture

### 9.1 AI System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     AI SERVICE LAYER                        │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ OCR Pipeline │  │ Summarizer   │  │ Chatbot Engine   │  │
│  │              │  │              │  │                  │  │
│  │ Tesseract +  │  │ GPT-4o +     │  │ RAG + GPT-4o    │  │
│  │ Google Vision│  │ Med Prompts  │  │ + Safety Layer   │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                   │             │
│         ▼                 ▼                   ▼             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Medical NER  │  │ Risk Scorer  │  │ Vector Search    │  │
│  │ (SpaCy +     │  │ (Rule-based  │  │ (Pinecone)       │  │
│  │  Custom)     │  │  + ML)       │  │                  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 OCR Pipeline Design

```
Document Upload
      │
      ▼
┌─────────────────┐
│ Pre-processing  │
│ • Deskew        │
│ • Noise removal │
│ • Contrast norm │
│ • Binarization  │
│ • Auto-crop     │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│ PDF?   │ │ Image? │
│ PyPDF2 │ │ OpenCV │
└───┬────┘ └───┬────┘
    │          │
    ▼          ▼
┌─────────────────┐
│  OCR Engine     │
│  Selection      │
│                 │
│ if confidence   │
│ < 0.7:          │
│   Google Vision │
│ else:           │
│   Tesseract     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Post-processing │
│ • Spell correct │
│ • Table detect  │
│ • Layout parse  │
│ • Field extract │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Medical NER     │
│ • Test names    │
│ • Values+units  │
│ • Ref ranges    │
│ • Doctor info   │
│ • Dates         │
│ • Hospital      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Structured JSON │
│ Output + Store  │
└─────────────────┘
```

**OCR Pipeline Details:**

| Stage | Tool | Purpose |
|---|---|---|
| Image Preprocessing | OpenCV, Pillow | Deskew, denoise, contrast, crop |
| PDF Text Extraction | PyPDF2, pdfplumber | Extract text from digital PDFs |
| Primary OCR | Tesseract 5.x | Free, on-premise, good for typed text |
| Fallback OCR | Google Cloud Vision | Handwritten text, low-quality scans |
| Table Extraction | Camelot, tabula-py | Structured lab report tables |
| Medical NER | SpaCy + custom model | Extract medical entities |
| Value Normalization | Custom rules engine | Standardize units, ranges |
| LOINC Mapping | LOINC lookup table | Map test names to LOINC codes |

**Supported Document Types:**

| Type | OCR Strategy | Expected Fields |
|---|---|---|
| Lab Report | Table extraction + NER | Test name, value, unit, ref range, date |
| Prescription | Handwriting OCR + NER | Drug name, dosage, frequency, duration |
| Discharge Summary | Full-page OCR + section detection | Diagnosis, procedures, medications, follow-up |
| Imaging Report | Full-page OCR | Findings, impression, recommendations |
| Vaccination Certificate | Structured field extraction | Vaccine name, date, dose number, facility |

### 9.3 AI Summarization Architecture

```
OCR Structured Data
        │
        ▼
┌───────────────────┐
│ Template Selection│
│ (by doc type)     │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ Prompt Assembly   │
│                   │
│ System: You are a │
│ medical report    │
│ analyst...        │
│                   │
│ User: Summarize   │
│ this lab report   │
│ for a patient...  │
│                   │
│ Data: {structured}│
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ LLM Call          │
│ GPT-4o / GPT-4o  │
│ mini (by plan)    │
│                   │
│ Temperature: 0.1  │
│ Max tokens: 1000  │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ Safety Filter     │
│ • No diagnosis    │
│ • No prescriptions│
│ • Add disclaimers │
│ • Flag critical   │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ Risk Assessment   │
│ • Compare to ref  │
│ • Flag abnormals  │
│ • Score severity  │
│ • Trend analysis  │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ Output:           │
│ • Plain summary   │
│ • Key findings[]  │
│ • Risk flags[]    │
│ • Recommendations │
│ • Disclaimer      │
└───────────────────┘
```

**Sample AI Summary Output:**

```json
{
  "summary": "Your blood test from April 15 shows well-controlled diabetes (HbA1c: 6.8%) and normal kidney function. Your cholesterol is slightly elevated. Overall, your results are encouraging.",
  "key_findings": [
    {"parameter": "HbA1c", "value": "6.8%", "status": "normal", "note": "Well-controlled diabetes"},
    {"parameter": "eGFR", "value": "92 mL/min", "status": "normal", "note": "Healthy kidney function"},
    {"parameter": "LDL Cholesterol", "value": "145 mg/dL", "status": "high", "note": "Above recommended 130 mg/dL"},
    {"parameter": "TSH", "value": "3.2 mIU/L", "status": "normal", "note": "Normal thyroid function"}
  ],
  "risk_flags": [
    {"parameter": "LDL Cholesterol", "severity": "moderate", "recommendation": "Discuss with your doctor about dietary changes or medication adjustment"}
  ],
  "disclaimer": "This summary is AI-generated for informational purposes. Always consult your doctor for medical advice."
}
```

### 9.4 Chatbot Architecture

```
User Message
      │
      ▼
┌──────────────────┐
│ Intent Classifier │
│ (fine-tuned)      │
│                   │
│ • health_query    │
│ • report_question │
│ • reminder_action │
│ • general_faq     │
│ • emergency       │
└────────┬──────────┘
         │
    ┌────┴────────────────┐
    ▼                     ▼
┌──────────┐    ┌─────────────────┐
│ Emergency│    │ Normal Flow     │
│ Redirect │    │                 │
│ "Call    │    │ 1. Retrieve     │
│  112"    │    │    user context │
│          │    │ 2. Vector search│
│          │    │    health docs  │
│          │    │ 3. Assemble RAG │
│          │    │    prompt       │
│          │    │ 4. LLM response │
│          │    │ 5. Safety check │
└──────────┘    └─────────────────┘
```

**Safety Guardrails:**
- Never prescribe medication
- Never diagnose conditions
- Always recommend consulting a doctor for abnormal values
- Emergency keywords trigger immediate 112/ambulance prompt
- All responses include medical disclaimer
- Content filtered for harmful medical advice

### 9.5 AI Cost Estimation

| Component | Model | Est. Cost/1M Users/Month |
|---|---|---|
| Report Summaries | GPT-4o | $3,200 (avg 2 reports/user/month) |
| Chatbot | GPT-4o-mini | $1,800 (avg 5 messages/user/month) |
| NER | Self-hosted SpaCy | $400 (compute) |
| Vector Search | Pinecone | $700 (Starter plan) |
| OCR (fallback) | Google Vision | $1,500 (30% fallback rate) |
| **Total** | | **~$7,600/month at 1M users** |

---

## 10. Compliance Requirements

### 10.1 Regulatory Framework

| Regulation | Applicability | Key Requirements |
|---|---|---|
| **HIPAA** (US) | If serving US users | PHI encryption, BAAs, access logs, breach notification |
| **DPDP Act** (India) | Primary market | Consent management, data localization, purpose limitation |
| **GDPR** (EU) | If serving EU users | Right to erasure, DPO appointment, DPIA |
| **ABDM** (India) | Health data interop | ABHA ID integration, consent-based data sharing |
| **IT Act 2000** (India) | All Indian users | Reasonable security practices, data retention |

### 10.2 Data Protection Measures

```
┌────────────────────────────────────────────────────┐
│              SECURITY LAYERS                       │
├────────────────────────────────────────────────────┤
│                                                    │
│  Layer 1: Transport Security                       │
│  • TLS 1.3 for all API calls                      │
│  • Certificate pinning in mobile apps             │
│  • mTLS between microservices                     │
│                                                    │
│  Layer 2: Data Encryption                          │
│  • AES-256-GCM for data at rest                   │
│  • Column-level encryption for PHI fields          │
│  • S3 server-side encryption (SSE-KMS)            │
│                                                    │
│  Layer 3: Access Control                           │
│  • RBAC with fine-grained permissions             │
│  • JWT with 15-min expiry + refresh tokens        │
│  • API key rotation every 90 days                 │
│                                                    │
│  Layer 4: Audit & Monitoring                       │
│  • Immutable audit logs (all PHI access)          │
│  • SIEM integration (Datadog/Splunk)              │
│  • Anomaly detection on access patterns           │
│                                                    │
│  Layer 5: Data Governance                          │
│  • Data retention policies (7 years medical)      │
│  • Right to deletion (GDPR/DPDP)                  │
│  • Data minimization (collect only needed)        │
│  • Anonymization for analytics                    │
│                                                    │
└────────────────────────────────────────────────────┘
```

### 10.3 HIPAA Compliance Checklist

- [ ] Encrypt all PHI at rest (AES-256) and in transit (TLS 1.3)
- [ ] Implement role-based access controls
- [ ] Maintain audit logs for all PHI access (6 years retention)
- [ ] Sign BAAs with all sub-processors (AWS, OpenAI, Twilio)
- [ ] Conduct annual risk assessment
- [ ] Implement breach notification procedures (72-hour window)
- [ ] Employee HIPAA training program
- [ ] Physical security controls for infrastructure
- [ ] Disaster recovery plan with RPO < 1 hour, RTO < 4 hours

---

## 11. Monetization Model

### 11.1 Freemium Tier Structure

| Feature | Free | Plus (₹99/mo) | Family (₹299/mo) | Premium (₹499/mo) |
|---|---|---|---|---|
| Document Uploads | 5/month | 50/month | 100/month | Unlimited |
| OCR Extraction | ✅ | ✅ | ✅ | ✅ |
| AI Summaries | 2/month | 20/month | 50/month | Unlimited |
| Medicine Reminders | 3 active | 20 active | 20/member | Unlimited |
| Water Reminders | ✅ | ✅ | ✅ | ✅ |
| Meal Reminders | ✅ | ✅ | ✅ | ✅ |
| Health Timeline | Last 3 months | Full history | Full history | Full history |
| Family Members | — | — | Up to 5 | Up to 10 |
| Chatbot Messages | 10/month | 50/month | 100/month | Unlimited |
| Doctor Sharing | 1 active link | 3 active links | 5 active links | Unlimited |
| Health Analytics | Basic | Advanced | Advanced | Advanced + Export |
| Priority Support | — | Email | Email + Chat | Phone + Priority |
| Data Export | — | ✅ | ✅ | ✅ |
| API Access | — | — | — | ✅ |

### 11.2 Revenue Projections

| Metric | Year 1 | Year 2 | Year 3 |
|---|---|---|---|
| Total Users | 500K | 2M | 10M |
| Paid Conversion Rate | 3% | 5% | 7% |
| Paid Users | 15K | 100K | 700K |
| ARPU (Annual) | ₹1,500 | ₹1,800 | ₹2,200 |
| ARR | ₹2.25 Cr | ₹18 Cr | ₹154 Cr |
| B2B (Clinics/Hospitals) | — | ₹3 Cr | ₹25 Cr |
| **Total Revenue** | **₹2.25 Cr** | **₹21 Cr** | **₹179 Cr** |

### 11.3 B2B Revenue Streams

| Stream | Model | Target |
|---|---|---|
| Clinic Dashboard | ₹5,000/month/clinic | Private clinics wanting patient data access |
| Hospital Integration | Custom pricing | Hospitals wanting ABDM-compliant data exchange |
| Pharma Analytics | Anonymized insights | Aggregate medication adherence data |
| Insurance Partnerships | Per-policy integration | Health score for insurance underwriting |

---

## 12. Deployment Architecture

### 12.1 Infrastructure Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      AWS CLOUD (ap-south-1)                     │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    VPC (10.0.0.0/16)                      │   │
│  │                                                          │   │
│  │  ┌─────────────────┐  ┌──────────────────────────────┐   │   │
│  │  │ Public Subnet   │  │ Private Subnet               │   │   │
│  │  │                 │  │                              │   │   │
│  │  │ ┌─────────────┐ │  │ ┌──────────┐ ┌────────────┐ │   │   │
│  │  │ │ ALB         │ │  │ │ EKS      │ │ RDS        │ │   │   │
│  │  │ │ (Load Bal.) │─┼──┼▶│ Cluster  │ │ PostgreSQL │ │   │   │
│  │  │ └─────────────┘ │  │ │ (3 nodes)│ │ (Multi-AZ) │ │   │   │
│  │  │                 │  │ └──────────┘ └────────────┘ │   │   │
│  │  │ ┌─────────────┐ │  │                              │   │   │
│  │  │ │ CloudFront  │ │  │ ┌──────────┐ ┌────────────┐ │   │   │
│  │  │ │ (CDN)       │ │  │ │ ElastiC. │ │ S3 Bucket  │ │   │   │
│  │  │ └─────────────┘ │  │ │ (Redis)  │ │ (Docs)     │ │   │   │
│  │  └─────────────────┘  │ └──────────┘ └────────────┘ │   │   │
│  │                       └──────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────────┐  │
│  │ Route 53 │ │ WAF      │ │ KMS      │ │ CloudWatch + X-Ray │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 12.2 Environment Strategy

| Environment | Purpose | Infrastructure |
|---|---|---|
| **Development** | Daily dev work | Local Docker Compose |
| **Staging** | Pre-release testing | EKS (1 node), RDS (db.t3.medium) |
| **Production** | Live users | EKS (3+ nodes), RDS (db.r6g.xlarge, Multi-AZ) |
| **DR (Disaster Recovery)** | Failover | ap-south-2, read replica, S3 cross-region |

### 12.3 CI/CD Pipeline

```
Code Push ──▶ GitHub Actions
                │
                ├──▶ Lint + Type Check
                ├──▶ Unit Tests (Jest/Pytest)
                ├──▶ Integration Tests
                ├──▶ Security Scan (Snyk/Trivy)
                ├──▶ Docker Build + Push to ECR
                │
                ▼
           ArgoCD (GitOps)
                │
                ├──▶ Deploy to Staging
                ├──▶ E2E Tests (Playwright)
                ├──▶ Manual QA Gate
                ├──▶ Canary Deploy to Prod (10%)
                ├──▶ Monitor (30 min)
                └──▶ Full Prod Rollout
```

---

## 13. Scaling Strategy

### 13.1 Scaling Targets

| Scale Point | Users | Strategy |
|---|---|---|
| 0 - 10K | Early adopters | Single region, vertical scaling |
| 10K - 100K | Growth | Horizontal pod autoscaling, read replicas |
| 100K - 1M | Scale | Multi-AZ, connection pooling (PgBouncer), CDN |
| 1M - 10M | Mass scale | Multi-region, sharding, dedicated OCR/AI clusters |
| 10M+ | Hyper-scale | Event-driven architecture, CQRS, edge computing |

### 13.2 Scaling by Component

| Component | Strategy | Tools |
|---|---|---|
| **API Servers** | HPA (CPU 60%, memory 70%) | K8s HPA, Karpenter |
| **Database** | Read replicas → Citus/sharding | PgBouncer, Citus |
| **Redis** | Cluster mode, 6 nodes | Redis Cluster |
| **OCR Workers** | Queue-based autoscaling | KEDA (queue length trigger) |
| **AI Workers** | Queue-based, GPU nodes | KEDA, spot instances |
| **File Storage** | S3 with CloudFront CDN | S3 Transfer Acceleration |
| **Notifications** | Partitioned by user_id hash | BullMQ, FCM batch API |

### 13.3 Performance Budgets

| Operation | Target (p95) | Scaling Lever |
|---|---|---|
| API Response | < 200ms | Caching, connection pooling |
| Document Upload | < 3s | Direct-to-S3, presigned URLs |
| OCR Processing | < 15s | Worker parallelism, GPU |
| AI Summary | < 20s | Async, streaming response |
| Push Notification | < 5s from trigger | FCM batch, regional delivery |
| Search (documents) | < 500ms | Elasticsearch / pgvector |
| App Cold Start | < 3s | Code splitting, lazy loading |
