# Maate PRD — Part 4: Folder Structure, Roadmap, Security, Notifications & FHIR

## 14. Project Folder Structure

```
maate/
├── apps/
│   ├── mobile/                          # React Native + Expo
│   │   ├── src/
│   │   │   ├── app/                     # Expo Router screens
│   │   │   │   ├── (auth)/
│   │   │   │   │   ├── login.tsx
│   │   │   │   │   └── otp-verify.tsx
│   │   │   │   ├── (tabs)/
│   │   │   │   │   ├── home.tsx
│   │   │   │   │   ├── timeline.tsx
│   │   │   │   │   ├── reminders.tsx
│   │   │   │   │   ├── chat.tsx
│   │   │   │   │   └── profile.tsx
│   │   │   │   ├── documents/
│   │   │   │   │   ├── upload.tsx
│   │   │   │   │   ├── [id].tsx
│   │   │   │   │   └── summary/[id].tsx
│   │   │   │   ├── family/
│   │   │   │   │   ├── index.tsx
│   │   │   │   │   ├── add-member.tsx
│   │   │   │   │   └── [memberId].tsx
│   │   │   │   ├── reminders/
│   │   │   │   │   ├── medicine/
│   │   │   │   │   ├── water/
│   │   │   │   │   └── meal/
│   │   │   │   └── analytics/
│   │   │   │       ├── trends.tsx
│   │   │   │       └── adherence.tsx
│   │   │   ├── components/
│   │   │   │   ├── ui/                  # Reusable UI primitives
│   │   │   │   │   ├── Button.tsx
│   │   │   │   │   ├── Card.tsx
│   │   │   │   │   ├── Input.tsx
│   │   │   │   │   ├── Modal.tsx
│   │   │   │   │   └── Toast.tsx
│   │   │   │   ├── documents/
│   │   │   │   │   ├── DocumentCard.tsx
│   │   │   │   │   ├── OCRPreview.tsx
│   │   │   │   │   └── AISummaryCard.tsx
│   │   │   │   ├── reminders/
│   │   │   │   │   ├── MedicineCard.tsx
│   │   │   │   │   ├── WaterTracker.tsx
│   │   │   │   │   └── MealCard.tsx
│   │   │   │   ├── timeline/
│   │   │   │   │   ├── TimelineItem.tsx
│   │   │   │   │   └── HealthChart.tsx
│   │   │   │   └── chat/
│   │   │   │       ├── ChatBubble.tsx
│   │   │   │       └── ChatInput.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   ├── useDocuments.ts
│   │   │   │   ├── useReminders.ts
│   │   │   │   ├── useFamily.ts
│   │   │   │   └── useNotifications.ts
│   │   │   ├── services/
│   │   │   │   ├── api.ts               # Axios instance
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── document.service.ts
│   │   │   │   ├── reminder.service.ts
│   │   │   │   └── notification.service.ts
│   │   │   ├── store/                   # Zustand stores
│   │   │   │   ├── authStore.ts
│   │   │   │   ├── reminderStore.ts
│   │   │   │   └── documentStore.ts
│   │   │   ├── utils/
│   │   │   │   ├── constants.ts
│   │   │   │   ├── formatters.ts
│   │   │   │   └── validators.ts
│   │   │   └── i18n/
│   │   │       ├── en.json
│   │   │       ├── hi.json
│   │   │       └── ta.json
│   │   ├── assets/
│   │   ├── app.json
│   │   └── package.json
│   │
│   ├── web/                             # Next.js Web Dashboard
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── shared/[token]/      # Doctor shared view
│   │   │   │   └── admin/
│   │   │   ├── components/
│   │   │   └── lib/
│   │   └── package.json
│   │
│   └── doctor-portal/                   # Doctor read-only portal
│       ├── src/
│       └── package.json
│
├── services/
│   ├── api-gateway/                     # Kong/custom gateway config
│   │   ├── kong.yml
│   │   └── plugins/
│   │
│   ├── auth-service/                    # Authentication microservice
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   │   └── auth.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── otp.service.ts
│   │   │   │   ├── jwt.service.ts
│   │   │   │   └── rbac.service.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.middleware.ts
│   │   │   │   └── rate-limit.middleware.ts
│   │   │   ├── routes/
│   │   │   │   └── auth.routes.ts
│   │   │   ├── models/
│   │   │   └── index.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── core-service/                    # Main business logic
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   │   ├── user.controller.ts
│   │   │   │   ├── document.controller.ts
│   │   │   │   ├── reminder.controller.ts
│   │   │   │   ├── family.controller.ts
│   │   │   │   ├── timeline.controller.ts
│   │   │   │   ├── analytics.controller.ts
│   │   │   │   └── share.controller.ts
│   │   │   ├── services/
│   │   │   ├── models/
│   │   │   ├── middleware/
│   │   │   ├── routes/
│   │   │   ├── jobs/                    # BullMQ job processors
│   │   │   │   ├── reminder.job.ts
│   │   │   │   └── analytics.job.ts
│   │   │   └── index.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── ocr-service/                     # Python OCR pipeline
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── pipeline/
│   │   │   │   ├── preprocessor.py
│   │   │   │   ├── ocr_engine.py
│   │   │   │   ├── table_extractor.py
│   │   │   │   ├── ner_extractor.py
│   │   │   │   └── postprocessor.py
│   │   │   ├── models/
│   │   │   │   └── medical_ner/
│   │   │   ├── utils/
│   │   │   │   ├── image_utils.py
│   │   │   │   └── loinc_mapper.py
│   │   │   └── config.py
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   ├── ai-service/                      # AI summarization + chatbot
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── summarizer/
│   │   │   │   ├── engine.py
│   │   │   │   ├── prompts/
│   │   │   │   │   ├── lab_report.py
│   │   │   │   │   ├── prescription.py
│   │   │   │   │   └── discharge.py
│   │   │   │   └── safety_filter.py
│   │   │   ├── chatbot/
│   │   │   │   ├── engine.py
│   │   │   │   ├── intent_classifier.py
│   │   │   │   ├── rag_retriever.py
│   │   │   │   └── safety_guardrails.py
│   │   │   ├── risk_scorer/
│   │   │   │   └── scorer.py
│   │   │   └── config.py
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   └── notification-service/            # Push + SMS + Email
│       ├── src/
│       │   ├── controllers/
│       │   ├── services/
│       │   │   ├── fcm.service.ts
│       │   │   ├── apns.service.ts
│       │   │   ├── sms.service.ts
│       │   │   └── email.service.ts
│       │   ├── scheduler/
│       │   │   ├── reminder.scheduler.ts
│       │   │   └── escalation.scheduler.ts
│       │   └── index.ts
│       ├── Dockerfile
│       └── package.json
│
├── packages/                            # Shared packages (monorepo)
│   ├── shared-types/                    # TypeScript type definitions
│   │   ├── src/
│   │   │   ├── user.types.ts
│   │   │   ├── document.types.ts
│   │   │   ├── reminder.types.ts
│   │   │   └── api.types.ts
│   │   └── package.json
│   ├── shared-utils/                    # Shared utility functions
│   └── shared-config/                   # Shared ESLint, TS configs
│
├── infrastructure/
│   ├── terraform/                       # IaC
│   │   ├── modules/
│   │   │   ├── eks/
│   │   │   ├── rds/
│   │   │   ├── redis/
│   │   │   ├── s3/
│   │   │   └── networking/
│   │   ├── environments/
│   │   │   ├── staging/
│   │   │   └── production/
│   │   └── main.tf
│   ├── k8s/                             # Kubernetes manifests
│   │   ├── base/
│   │   │   ├── auth-service/
│   │   │   ├── core-service/
│   │   │   ├── ocr-service/
│   │   │   ├── ai-service/
│   │   │   └── notification-service/
│   │   └── overlays/
│   │       ├── staging/
│   │       └── production/
│   └── docker/
│       └── docker-compose.yml           # Local development
│
├── database/
│   ├── migrations/                      # Knex/Prisma migrations
│   ├── seeds/
│   └── schema.prisma
│
├── docs/
│   ├── PRD.md
│   ├── API.md
│   ├── architecture.md
│   └── runbook.md
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── cd-staging.yml
│       └── cd-production.yml
│
├── turbo.json                           # Turborepo config
├── package.json                         # Root package.json
├── pnpm-workspace.yaml
└── README.md
```

---

## 15. Engineering Roadmap

### Phase 1: Foundation (Weeks 1-4)

| Week | Backend | Mobile | Infra |
|---|---|---|---|
| 1 | Project scaffolding, DB schema, Prisma setup | Expo init, navigation, design system | Docker Compose, CI pipeline |
| 2 | Auth service (OTP, JWT, refresh) | Auth screens (login, OTP, onboarding) | RDS provisioning, Redis setup |
| 3 | User CRUD, profile management | Profile screens, settings | S3 bucket, IAM roles |
| 4 | Document upload API, S3 integration | Document upload UI (camera + gallery) | EKS cluster setup |

### Phase 2: Core Intelligence (Weeks 5-9)

| Week | Backend | Mobile | AI/ML |
|---|---|---|---|
| 5 | OCR job queue, worker setup | Document list, detail views | OCR pipeline v1 (Tesseract) |
| 6 | OCR result storage, retry logic | OCR review/edit screen | Google Vision fallback, NER v1 |
| 7 | AI summary API, prompt engineering | AI summary display, risk flags | Lab report summarizer v1 |
| 8 | Medicine reminder CRUD + scheduler | Reminder creation flow, time picker | Summary accuracy testing |
| 9 | Water + Meal reminder engines | Water tracker UI, meal reminder cards | Chatbot v1 (FAQ intents) |

### Phase 3: Connectivity (Weeks 10-14)

| Week | Backend | Mobile | Platform |
|---|---|---|---|
| 10 | Family group CRUD, invite system | Family management screens | Push notification infrastructure |
| 11 | Dependent access, permission system | Dependent timeline view | FCM + APNs integration |
| 12 | Health timeline API, aggregation | Timeline UI with filters | Reminder escalation engine |
| 13 | Doctor sharing (token generation) | Share flow, QR code generation | Doctor portal (Next.js) |
| 14 | Analytics aggregation engine | Analytics dashboard, charts | End-to-end testing |

### Phase 4: Polish & Launch (Weeks 15-22)

| Week | Activity |
|---|---|
| 15-16 | Security audit, penetration testing, VAPT |
| 17 | Performance optimization, load testing (k6) |
| 18 | Closed beta launch (1000 users), bug tracking |
| 19-20 | Bug fixes, UX refinements based on beta feedback |
| 21 | App Store / Play Store submission |
| 22 | Public launch, monitoring, on-call rotation |

---

## 16. Security Requirements

### 16.1 Authentication & Authorization

```
┌─────────────────────────────────────────────┐
│           AUTH FLOW                          │
│                                             │
│  User ──▶ Phone/Email + OTP                 │
│       ──▶ Verify OTP                        │
│       ──▶ Issue JWT (15 min) + Refresh (30d)│
│       ──▶ Store refresh in httpOnly cookie  │
│                                             │
│  Every API call:                            │
│  ──▶ Validate JWT signature                 │
│  ──▶ Check token expiry                     │
│  ──▶ Verify RBAC permissions                │
│  ──▶ Check resource ownership               │
│  ──▶ Log access (audit trail)               │
└─────────────────────────────────────────────┘
```

### 16.2 Security Measures

| Category | Measure | Implementation |
|---|---|---|
| **Input Validation** | Sanitize all inputs | Joi/Zod schemas, parameterized queries |
| **SQL Injection** | ORM-only DB access | Prisma ORM, no raw SQL |
| **XSS** | Content Security Policy | Helmet.js, React auto-escaping |
| **CSRF** | Token-based | SameSite cookies, CSRF tokens |
| **Rate Limiting** | Per-user, per-endpoint | Redis sliding window (100/min default) |
| **DDoS** | WAF + CloudFront | AWS WAF rules, Shield Advanced |
| **Secrets** | Vault-managed | AWS Secrets Manager, no env file secrets |
| **Dependencies** | Automated scanning | Snyk/Dependabot, weekly scans |
| **Container** | Minimal base images | Distroless, non-root containers |
| **Network** | Service mesh | Istio mTLS, network policies |
| **Data** | Field-level encryption | PHI columns encrypted (pgcrypto) |
| **Logging** | No PHI in logs | Structured logging, PII masking |
| **Pen Testing** | Annual + pre-launch | Third-party VAPT vendor |
| **Incident Response** | Documented runbook | PagerDuty, 15-min response SLA |

### 16.3 Data Classification

| Classification | Examples | Controls |
|---|---|---|
| **Critical (PHI)** | Medical reports, lab values, diagnoses | AES-256 encryption, access logging, RBAC |
| **Sensitive (PII)** | Name, DOB, phone, email | Encrypted at rest, minimal retention |
| **Internal** | Reminder configs, preferences | Standard encryption |
| **Public** | App content, FAQs | No special controls |

---

## 17. Notification Architecture

### 17.1 Notification Flow

```
Reminder Scheduler (BullMQ - CRON)
           │
           │  Every minute, check due reminders
           ▼
┌─────────────────────────┐
│  Notification Dispatcher│
│                         │
│  1. Query due reminders │
│  2. Build notification  │
│  3. Select channel      │
│  4. Dispatch            │
└────────┬────────────────┘
         │
    ┌────┼────────────────┐
    ▼    ▼                ▼
┌──────┐ ┌──────┐  ┌──────────┐
│ Push │ │ SMS  │  │ In-App   │
│ (FCM │ │(Twilio│  │(WebSocket│
│ APNs)│ │     )│  │         )│
└──┬───┘ └──┬───┘  └────┬─────┘
   │        │           │
   ▼        ▼           ▼
┌─────────────────────────────┐
│     Delivery Tracking       │
│  • Sent timestamp           │
│  • Delivery receipt         │
│  • Open/response tracking   │
└──────────────┬──────────────┘
               │
               │  If no response in {escalate_after} min
               ▼
┌─────────────────────────────┐
│     Escalation Engine       │
│  1. Second reminder (push)  │
│  2. SMS to user             │
│  3. Alert to family member  │
│  4. Log escalation          │
└─────────────────────────────┘
```

### 17.2 Channel Selection Logic

```python
def select_channel(user, reminder_type, attempt):
    if attempt == 1:
        return ["push", "in_app"]
    elif attempt == 2:
        return ["push", "in_app"]  # More aggressive (sound + vibration)
    elif attempt == 3:
        if user.is_senior_citizen:
            return ["sms"]  # SMS as last resort for seniors
        return ["push"]
    elif attempt == 4:  # Escalation
        family = get_family_caregivers(user)
        for caregiver in family:
            send_push(caregiver, f"{user.name} missed their {reminder_type}")
        return ["escalation"]
```

### 17.3 Notification Templates

| Event | Title | Body | Channel |
|---|---|---|---|
| Medicine Due | 💊 दवाई का समय | {name} - {dosage} लेने का समय हो गया | Push |
| Medicine Missed | ⚠️ दवाई छूट गई | {parent_name} ने {medicine} नहीं ली | Push (caregiver) |
| Water Reminder | 💧 पानी पीजिए | एक गिलास पानी पी लीजिए ({current}/{goal} ml) | Push |
| Meal Time | 🍽️ खाने का समय | {meal_type} का समय हो गया | Push |
| Report Ready | 📋 रिपोर्ट तैयार | AI summary ready for your {doc_type} | Push + In-App |
| Abnormal Value | 🔴 ध्यान दें | {parameter} is {status} ({value}) | Push + In-App |
| Share Accessed | 👁️ Doctor Viewed | Dr. {name} viewed your shared records | In-App |

---

## 18. FHIR-Compatible Schema Design

### 18.1 FHIR Resource Mapping

| Maate Entity | FHIR Resource | Version |
|---|---|---|
| User | Patient | R4 |
| Health Record (lab) | Observation | R4 |
| Document | DocumentReference | R4 |
| Medicine Reminder | MedicationRequest | R4 |
| Diagnosis | Condition | R4 |
| Doctor Share | Consent | R4 |
| Allergy | AllergyIntolerance | R4 |
| Vaccination | Immunization | R4 |

### 18.2 FHIR Patient Resource Mapping

```json
{
  "resourceType": "Patient",
  "id": "maate-user-uuid",
  "identifier": [
    {
      "system": "https://maate.health/patient-id",
      "value": "uuid"
    },
    {
      "system": "https://healthid.abdm.gov.in",
      "value": "ABHA-ID (if linked)"
    }
  ],
  "name": [
    {
      "use": "official",
      "given": ["Priya"],
      "family": "Sharma"
    }
  ],
  "gender": "female",
  "birthDate": "1984-03-15",
  "telecom": [
    {
      "system": "phone",
      "value": "+91-9876543210",
      "use": "mobile"
    }
  ],
  "extension": [
    {
      "url": "https://maate.health/ext/blood-group",
      "valueString": "B+"
    }
  ]
}
```

### 18.3 FHIR Observation (Lab Result) Mapping

```json
{
  "resourceType": "Observation",
  "id": "health-record-uuid",
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/observation-category",
          "code": "laboratory"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "http://loinc.org",
        "code": "4548-4",
        "display": "Hemoglobin A1c"
      }
    ],
    "text": "HbA1c"
  },
  "subject": {
    "reference": "Patient/maate-user-uuid"
  },
  "effectiveDateTime": "2026-04-15",
  "valueQuantity": {
    "value": 6.8,
    "unit": "%",
    "system": "http://unitsofmeasure.org",
    "code": "%"
  },
  "referenceRange": [
    {
      "low": {"value": 4.0, "unit": "%"},
      "high": {"value": 5.6, "unit": "%"},
      "text": "Normal: 4.0-5.6%"
    }
  ],
  "interpretation": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
          "code": "H",
          "display": "High"
        }
      ]
    }
  ]
}
```

### 18.4 FHIR MedicationRequest Mapping

```json
{
  "resourceType": "MedicationRequest",
  "id": "medicine-reminder-uuid",
  "status": "active",
  "intent": "order",
  "medicationCodeableConcept": {
    "text": "Metformin 500mg"
  },
  "subject": {
    "reference": "Patient/maate-user-uuid"
  },
  "dosageInstruction": [
    {
      "timing": {
        "repeat": {
          "frequency": 2,
          "period": 1,
          "periodUnit": "d",
          "timeOfDay": ["07:00", "21:00"]
        }
      },
      "doseAndRate": [
        {
          "doseQuantity": {
            "value": 500,
            "unit": "mg"
          }
        }
      ],
      "additionalInstruction": [
        {
          "text": "Take after meals"
        }
      ]
    }
  ],
  "dispenseRequest": {
    "validityPeriod": {
      "start": "2026-01-01",
      "end": "2026-12-31"
    }
  }
}
```

### 18.5 FHIR DocumentReference Mapping

```json
{
  "resourceType": "DocumentReference",
  "id": "document-uuid",
  "status": "current",
  "type": {
    "coding": [
      {
        "system": "http://loinc.org",
        "code": "11502-2",
        "display": "Laboratory report"
      }
    ]
  },
  "subject": {
    "reference": "Patient/maate-user-uuid"
  },
  "date": "2026-04-15T10:30:00Z",
  "author": [
    {
      "display": "Apollo Diagnostics"
    }
  ],
  "content": [
    {
      "attachment": {
        "contentType": "application/pdf",
        "url": "https://storage.maate.health/docs/uuid.pdf",
        "title": "Blood Test Report"
      }
    }
  ],
  "context": {
    "related": [
      {
        "reference": "Observation/health-record-uuid-1"
      },
      {
        "reference": "Observation/health-record-uuid-2"
      }
    ]
  }
}
```

### 18.6 ABDM Integration Points

| Integration | Purpose | Standard |
|---|---|---|
| ABHA ID Linking | National health ID | ABDM API v3 |
| Health Information Exchange | Share records with ABDM network | FHIR R4 |
| Consent Manager | Patient consent for data sharing | ABDM Consent Manager |
| Health Locker | Store documents in national locker | ABDM PHR |

```
User ──▶ Links ABHA ID in Maate
     ──▶ Grants consent for data types
     ──▶ Maate pushes FHIR Bundles to ABDM
     ──▶ Any ABDM-linked provider can request data
     ──▶ User approves/denies via consent flow
```

---

## Appendix A: Glossary

| Term | Definition |
|---|---|
| PHI | Protected Health Information |
| PII | Personally Identifiable Information |
| FHIR | Fast Healthcare Interoperability Resources |
| LOINC | Logical Observation Identifiers Names and Codes |
| SNOMED | Systematized Nomenclature of Medicine |
| ABDM | Ayushman Bharat Digital Mission |
| ABHA | Ayushman Bharat Health Account |
| OCR | Optical Character Recognition |
| NER | Named Entity Recognition |
| RAG | Retrieval-Augmented Generation |
| HPA | Horizontal Pod Autoscaler |
| KEDA | Kubernetes Event-Driven Autoscaling |
| CQRS | Command Query Responsibility Segregation |
| BAA | Business Associate Agreement |
| DPDP | Digital Personal Data Protection (India) |
| VAPT | Vulnerability Assessment and Penetration Testing |

---

## Appendix B: Risk Register

| Risk | Impact | Probability | Mitigation |
|---|---|---|---|
| OCR accuracy < 85% on handwritten prescriptions | High | Medium | Fallback to Google Vision + manual correction UI |
| AI hallucination in medical summaries | Critical | Medium | Safety filter, disclaimer, human review for critical flags |
| Data breach | Critical | Low | Encryption, WAF, pen testing, incident response plan |
| Regulatory non-compliance | Critical | Low | Legal counsel, compliance audits, DPDP self-assessment |
| Push notification delivery failure | High | Medium | Multi-channel fallback (push → SMS → call) |
| Cloud cost overrun | Medium | Medium | Spot instances, reserved capacity, cost alerts |
| User adoption stall | High | Medium | Freemium model, referral program, doctor advocacy |
| LLM API rate limiting / downtime | High | Low | Queue-based processing, fallback to GPT-4o-mini |

---

> **Document End**  
> This PRD should be reviewed by: Product, Engineering, Legal/Compliance, Design, and Medical Advisory teams.  
> Next steps: Stakeholder review → Figma design sprint → Sprint 0 kickoff
