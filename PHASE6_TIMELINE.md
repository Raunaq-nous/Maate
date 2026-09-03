# Phase 6: Unified Health Timeline & Analytics Aggregation

## Overview
Phase 6 builds the core longitudinal record and health intelligence layer for the Maate health management system. It integrates uploaded medical documents, biometric vitals, symptom tracking, chronic condition management, clinical doctor notes, and daily reminder adherence into a single, high-performance chronological timeline with real-time analytics aggregation.

---

## 1. Architecture & Data Model

### Unified Aggregation Model (`TimelineEvent`)
The `TimelineEvent` entity serves as the single source of truth for user health history:
- **`eventType`**: Enum covering `DOCUMENT_UPLOADED`, `LAB_RESULT`, `VITAL_RECORDED`, `MEDICATION_STARTED`, `MEDICATION_STOPPED`, `SYMPTOM_REPORTED`, `CONDITION_DIAGNOSED`, `CONDITION_RESOLVED`, `DOCTOR_VISIT`, `MILESTONE`.
- **`severity`**: `MILD`, `MODERATE`, `SEVERE`, `CRITICAL`.
- **`refResourceType` / `refResourceId`**: Polymorphic reference to underlying records (`VitalSign`, `SymptomEntry`, `ChronicCondition`, `DoctorNote`, `Document`, `ReminderLog`).
- **`metadata`**: Rich structured JSON containing vital values, dosage, symptoms, triggers, ICD codes, and lab metrics.
- **Caching**: Multi-tenant Redis caching (`timeline:${userId}:*` and `analytics:${userId}:*`) with write-through invalidation on any new event or pin toggle.

### Clinical Models Activated
- **`VitalSign`**: Blood pressure, heart rate, blood sugar, weight, temperature, SpO2, sleep hours.
- **`SymptomEntry`**: Symptom logging with severity, duration, body area, triggers, accompanied symptoms, and resolution timestamps.
- **`ChronicCondition`**: Long-term condition tracking with ICD-10 codes, SNOMED CT codes, status, and management plans.
- **`DoctorNote`**: Clinical SOAP / consultation notes with diagnosis, assessments, ICD/CPT codes, and follow-up schedules.

---

## 2. API Endpoints Implemented

### Clinical Data CRUD (`apps/api/src/modules/health/`)
| Endpoint | Method | Description | Timeline Event Emitted |
|---|---|---|---|
| `/api/v1/vitals` | `POST` | Record new vital sign measurement | `VITAL_RECORDED` |
| `/api/v1/vitals` | `GET` | List vitals with date and type filters | — |
| `/api/v1/vitals/latest` | `GET` | Get most recent reading per vital type | — |
| `/api/v1/vitals/:id` | `DELETE` | Delete vital sign record | — |
| `/api/v1/symptoms` | `POST` | Log new symptom entry | `SYMPTOM_REPORTED` |
| `/api/v1/symptoms` | `GET` | List symptoms with filters | — |
| `/api/v1/symptoms/:id/resolve` | `PATCH` | Mark symptom as resolved | `CONDITION_RESOLVED` |
| `/api/v1/symptoms/:id` | `DELETE` | Delete symptom entry | — |
| `/api/v1/conditions` | `POST` | Record chronic condition | `CONDITION_DIAGNOSED` |
| `/api/v1/conditions` | `GET` | List chronic conditions by status | — |
| `/api/v1/conditions/:id` | `PATCH` | Update condition status/plan | `CONDITION_RESOLVED` (if status updated) |
| `/api/v1/conditions/:id` | `DELETE` | Soft-delete chronic condition | — |
| `/api/v1/doctor-notes` | `POST` | Record clinical encounter note | `DOCTOR_VISIT` |
| `/api/v1/doctor-notes` | `GET` | List clinical doctor notes | — |
| `/api/v1/doctor-notes/:id` | `GET` | Get detailed doctor note | — |
| `/api/v1/doctor-notes/:id` | `DELETE` | Soft-delete doctor note | — |

### Timeline Aggregation (`apps/api/src/modules/timeline/`)
| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/timeline` | `GET` | Unified chronological feed with pagination, date range, pinned priority, and type filters |
| `/api/v1/timeline/:id/pin` | `PATCH` | Pin or unpin timeline event to top |
| `/api/v1/timeline/summary` | `GET` | Highlights: total count, 30-day activity, critical flags count, last update timestamp, and type breakdown |

### Analytics & Biomarker Trends (`apps/api/src/modules/health/`)
| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/analytics/dashboard` | `GET` | Aggregated dashboard: adherence rate, water intake stats, sleep trends, biomarker trends, and weighted health score (0-100) |
| `/api/v1/analytics/trends` | `GET` | Time-series data points and summary statistics (min, max, avg, latest) for specific vital types (`BLOOD_PRESSURE`, `HEART_RATE`, etc.) or lab parameters (`Hemoglobin`, etc.) |
| `/api/v1/analytics/adherence` | `GET` | Medication adherence statistics with daily chart series |
| `/api/v1/analytics/intake` | `GET` | Daily hydration intake and goal achievement metrics |
| `/api/v1/analytics/risk-score` | `GET` | Composite health risk score breakdown |

---

## 3. Cross-Module Integration

1. **Document Ingestion (Phase 3 & 4)**:
   - Document upload triggers `DOCUMENT_UPLOADED` timeline events with document metadata and preview URLs.
2. **Reminder Adherence (Phase 5)**:
   - Medication adherence (`TAKEN` / `SKIPPED`) records `MEDICATION_STARTED` (dose taken) and `MEDICATION_STOPPED` (dose skipped) events with reason notes and moderate severity flags.
   - Meal logs record `MILESTONE` events.
   - **Water Logging Design Rationale**: Water reminders fire multiple times daily (~8-10 glasses). Creating individual `TimelineEvent` records for every 250ml intake would flood the timeline and degrade user signal-to-noise ratio. Hydration is logged in `ReminderLog` and aggregated into daily intake trends in `AnalyticsService`.

---

## 4. Frontend Web & Mobile Implementation

### Web Application (`apps/web`)
- **New Route**: `/timeline` (`apps/web/src/app/(dashboard)/timeline/page.tsx`).
- **Features**:
  - Live metric highlight cards (Total Records, 30-Day Activity, Attention Items, Last Update).
  - Multi-tab event filtering (All, Documents, Vitals, Medications, Symptoms, Conditions, Doctor Notes).
  - Search bar with instant client-side filtering.
  - Chronological date grouping with visual timeline connectors and status badges.
  - Event pinning / unpinning with optimistic UI updates.
  - Navigation integrated into desktop sidebar and mobile bottom navigation.

### Mobile Application (`apps/mobile`)
- **Screens**: `apps/mobile/src/app/(tabs)/timeline.tsx` & `analytics/index.tsx`.
- **Integration**:
  - `useTimelineStore` wired directly to `GET /timeline` with server-side pagination, category filtering, and pull-to-refresh.
  - `useAnalyticsStore` consuming `GET /analytics/dashboard` for live adherence charts, hydration metrics, and biomarker sparklines.

---

## 5. End-to-End Live Verification Evidence

Live verification was executed via `scratch/test_phase6_timeline.py` against Priya Sharma's seeded account (`priya@example.com`):

```text
====================================================
 PHASE 6 E2E LIVE VERIFICATION: TIMELINE & ANALYTICS
====================================================

1. Authenticating as Priya Sharma (priya@example.com)...
   Authenticated: userId=947d1239-4c59-4ccd-8949-8f84f1f8d0ff

2. Creating VitalSign measurement (Blood Pressure 120/80 mmHg)...
   Created VitalSign: id=5a32d530-b7ae-4b94-85c3-0edbd8e8aeb3, type=BLOOD_PRESSURE, value=120/80 mmHg

   Creating VitalSign measurement (Heart Rate 72 bpm)...
   Created Heart Rate Vital: id=bd09dd86-d591-4f5b-90c3-183cb2f777dc, value=72 bpm

3. Creating SymptomEntry (Mild Tension Headache)...
   Created SymptomEntry: id=2a0008dd-0c83-4b19-bd15-6e342d9d3e51, name=Tension Headache, severity=MILD

4. Creating ChronicCondition (Hypertension)...
   Created ChronicCondition: id=926ccc84-1740-45ae-aace-bc7a94d2e866, name=Essential Hypertension

5. Creating DoctorNote (Consultation Note)...
   Created DoctorNote: id=0ac89586-2e08-4a22-83ff-5a470977ca24, title=Cardiology Follow-up with Dr. Mehra

6. Recording Reminder Adherence (Metformin 500mg taken)...
   Logged adherence for Metformin 500mg: TAKEN

7. Querying Unified Health Timeline (GET /timeline)...
   Timeline returned 6 events (total=6):
     [MEDICATION_STARTED] - Dose Taken: Metformin 500mg | Occurred: 2026-09-03T07:29:27.214Z | Ref: ReminderLog
     [DOCTOR_VISIT] - Cardiology Follow-up with Dr. Mehra | Occurred: 2026-09-03T07:29:27.184Z | Ref: DoctorNote
     [CONDITION_DIAGNOSED] - Condition Diagnosed: Essential Hypertension | Occurred: 2026-09-03T07:29:27.168Z | Ref: ChronicCondition
     [SYMPTOM_REPORTED] - Symptom Reported: Tension Headache | Occurred: 2026-09-03T07:29:27.153Z | Ref: SymptomEntry
     [VITAL_RECORDED] - HEART RATE: 72 bpm | Occurred: 2026-09-03T07:29:27.147Z | Ref: VitalSign
     [VITAL_RECORDED] - BLOOD PRESSURE: 120/80 mmHg | Occurred: 2026-09-03T07:29:27.123Z | Ref: VitalSign

   VERIFIED: Unified timeline contains Vitals, Symptoms, Conditions, Doctor Notes, and Medication Adherence!

8. Testing Timeline Pinning (PATCH /timeline/:id/pin)...
   Pinned event f5a8add8-728f-4c13-bb4b-f33f3cf69879: success=True

9. Querying Timeline Summary Stats (GET /timeline/summary)...
   Summary: Total=6, Recent(30d)=6, CriticalFlags=0
   Breakdown by Type: {
     "MEDICATION_STARTED": 1,
     "VITAL_RECORDED": 2,
     "SYMPTOM_REPORTED": 1,
     "CONDITION_DIAGNOSED": 1,
     "DOCTOR_VISIT": 1
   }

10. Querying Analytics Dashboard (GET /analytics/dashboard)...
   Health Score: 83/100
   Medication Adherence: 67% (Taken: 2, Missed: 1)
   Water Intake: avg=0.3L/day, goalHitDays=0
   Biomarker & Vital Trends count: 2
     Trend: Blood Pressure = 120/80 mmHg (normal, trend=0)
     Trend: Heart Rate = 72 bpm (normal, trend=0)

11. Querying Vital Trend Series (GET /analytics/trends?vitalType=BLOOD_PRESSURE)...
   BP Trend: count=1, summary={'min': 120, 'max': 120, 'avg': 120, 'latestValue': 120}
     - Date: 2026-09-03, Value: 120/80, Status: NORMAL

12. Cleaning up test records...
   Test records cleaned up.

====================================================
 🎉 ALL PHASE 6 E2E VERIFICATION CHECKS PASSED!
====================================================
```

---

## 6. Monorepo Quality Gate Status
- `pnpm install`: Clean
- `pnpm run lint`: 0 errors
- `pnpm run typecheck`: 7/7 packages clean
- `pnpm run format:check`: 100% formatted
- `pnpm run test:ci`: All test suites passing
- `pnpm run build`: All packages and apps built cleanly (Turbo cache verified)
