# Maate — AI-Powered Personal Health Management App
## Product Requirement Document (PRD) — Part 1: Product Vision & Strategy

> **Version:** 1.0 | **Date:** 2026-05-07 | **Author:** Staff Engineer & Healthcare Product Architect  
> **Status:** Draft | **Target Scale:** 10M+ users

---

## 1. Executive Summary

**Maate** is an AI-powered personal health management platform that empowers individuals and families to take control of their health data. It consolidates medical records via OCR extraction, delivers intelligent summaries of lab reports, manages medication/water/meal reminders, and provides a health timeline with analytics — all in a HIPAA/DPDP-compliant, scalable architecture designed for millions of concurrent users.

### 1.1 Problem Statement

| Problem | Impact |
|---|---|
| Medical records scattered across hospitals, labs, clinics | Patients can't provide complete history to new doctors |
| Senior citizens forget medications, water intake, meals | Health deterioration, emergency hospitalizations |
| Families managing elderly parents remotely have no visibility | Anxiety, delayed intervention |
| Lab reports are cryptic and hard to interpret | Patients make uninformed health decisions |
| No unified health timeline exists across providers | Doctors lack longitudinal patient context |
| Chronic disease patients need continuous monitoring | Poor adherence leads to complications |

### 1.2 Product Vision

> *"Every person's complete health story — organized, understood, and actionable — in their pocket."*

### 1.3 Success Metrics (North Star)

| Metric | Target (Year 1) | Target (Year 3) |
|---|---|---|
| Monthly Active Users (MAU) | 500K | 10M |
| Documents Uploaded/month | 2M | 50M |
| Reminder Adherence Rate | >75% | >85% |
| AI Summary Accuracy (NLP F1) | >0.90 | >0.95 |
| User Retention (D30) | >40% | >55% |
| NPS Score | >50 | >65 |

---

## 2. User Personas

### 2.1 Persona 1: Priya — The Chronic Disease Patient

| Attribute | Detail |
|---|---|
| **Age** | 42 |
| **Occupation** | School Teacher |
| **Location** | Jaipur, India |
| **Condition** | Type 2 Diabetes, Hypertension |
| **Tech Savviness** | Medium — uses WhatsApp, Paytm daily |
| **Devices** | Android mid-range phone, 4G connection |

**Goals:**
- Track blood sugar and BP readings over time
- Never miss medications (takes 6 pills/day across 3 time slots)
- Understand what her lab reports mean without Googling
- Share reports with her endocrinologist before appointments

**Frustrations:**
- Has 3 years of reports in a drawer — no way to search or trend them
- Forgot evening medication twice this week
- Doctor asked for "last 6 months of HbA1c" — took 2 hours to find
- Doesn't understand what "eGFR 58" means

**Behavioral Traits:**
- Checks phone 40+ times/day
- Responds well to gentle push notifications
- Prefers Hindi UI with English medical terms
- Will pay ₹99/month if value is clear

---

### 2.2 Persona 2: Rajesh — The Remote Family Caregiver

| Attribute | Detail |
|---|---|
| **Age** | 35 |
| **Occupation** | Software Engineer |
| **Location** | Bangalore (parents in Lucknow) |
| **Situation** | Managing health of both parents (ages 65, 68) |
| **Tech Savviness** | High |
| **Devices** | iPhone 15, MacBook, parents have Android phones |

**Goals:**
- Get alerts when parents miss medications
- View parents' health timeline and upcoming appointments
- Upload and organize parents' medical documents remotely
- Talk to parents' doctor with full context

**Frustrations:**
- Mom (68) was prescribed a new BP medicine — he found out 2 weeks later
- Dad (65) forgets to drink water, got hospitalized for kidney stones
- Can't coordinate between 3 different doctors his parents see
- No single place to see parents' complete health picture

**Behavioral Traits:**
- Willing to pay premium (₹499/month) for family plan
- Wants dashboard-style view, not just a list
- Needs cross-platform (iOS + Android + Web)
- Values data privacy highly

---

### 2.3 Persona 3: Kamla Devi — The Senior Citizen

| Attribute | Detail |
|---|---|
| **Age** | 72 |
| **Occupation** | Retired |
| **Location** | Delhi, India |
| **Condition** | Arthritis, mild cognitive decline, post-cardiac stent |
| **Tech Savviness** | Very low — son set up WhatsApp |
| **Devices** | Basic Android phone, large font enabled |

**Goals:**
- Get reminded to take her 8 daily medications at correct times
- Drink enough water (doctor said 2.5L/day)
- Eat meals on time (diabetic diet)
- Son should know if she missed something

**Frustrations:**
- Too many pills, can't remember which is for what
- Phone apps are too small and complicated
- Doesn't want to "learn a new app"
- Feels dependent and wants some autonomy

**Behavioral Traits:**
- Needs extra-large UI, voice-guided interactions
- Prefers phone call or alarm-style reminders over silent notifications
- Family member will do initial setup
- Responds to encouraging, warm tone ("शाबाश! दवाई ले ली 👏")

---

### 2.4 Persona 4: Dr. Mehra — The Consulting Physician

| Attribute | Detail |
|---|---|
| **Age** | 50 |
| **Occupation** | General Physician, private practice |
| **Location** | Mumbai, India |
| **Patients** | ~40/day |
| **Tech Savviness** | Medium-High |
| **Devices** | iPad, iPhone |

**Goals:**
- Receive organized patient records before appointments
- View patient's medication adherence history
- See trends in lab values (glucose, lipids, kidney function)
- Reduce time spent asking "bring your old reports"

**Frustrations:**
- Patients bring crumpled reports, some missing
- No way to see medication adherence between visits
- Spends 5 minutes per patient just gathering history
- Wants structured data, not PDFs

**Behavioral Traits:**
- Will adopt if it saves consultation time
- Needs read-only access (won't enter data)
- Values FHIR-compatible data exchange
- Refers patients to app if experience is good (organic growth channel)

---

## 3. User Journey Maps

### 3.1 Journey: Priya Uploads a Lab Report

```
┌─────────────┐    ┌──────────────┐    ┌───────────────┐    ┌──────────────┐
│  Opens App   │───▶│ Taps "Upload" │───▶│ Takes Photo / │───▶│ OCR Extracts │
│  (Home)      │    │  Document     │    │ Selects PDF   │    │  Data Fields │
└─────────────┘    └──────────────┘    └───────────────┘    └──────┬───────┘
                                                                   │
                                                                   ▼
┌──────────────┐    ┌──────────────┐    ┌───────────────┐    ┌──────────────┐
│ Shares with  │◀───│ Views Health │◀───│ AI Generates  │◀───│ User Reviews │
│ Dr. Mehra    │    │  Timeline    │    │  Summary      │    │ & Confirms   │
└──────────────┘    └──────────────┘    └───────────────┘    └──────────────┘
```

**Touchpoints & Emotions:**

| Step | Action | Emotion | Design Consideration |
|---|---|---|---|
| 1 | Opens app | Neutral | Fast load (<2s), clear CTA |
| 2 | Taps upload | Purposeful | Single prominent button |
| 3 | Captures/selects document | Slight anxiety | Auto-crop, quality guidance overlay |
| 4 | OCR extraction | Anticipation | Progress animation, <10s processing |
| 5 | Reviews extracted data | Relief/Surprise | Editable fields, highlighted values |
| 6 | Reads AI summary | Empowered | Plain language, color-coded risk |
| 7 | Views on timeline | Satisfaction | Trend visualization |
| 8 | Shares with doctor | Confidence | One-tap share, expiry controls |

---

### 3.2 Journey: Rajesh Sets Up Parents' Profiles

```
Step 1: Rajesh creates Family Group
Step 2: Adds Mom (Kamla) as family member
Step 3: Sets her medication schedule (8 meds, 3 time slots)
Step 4: Configures water reminders (every 90 min, 7AM-9PM)
Step 5: Sets meal reminders (breakfast 8AM, lunch 1PM, dinner 7:30PM)
Step 6: Uploads her last 6 months of reports
Step 7: Enables "missed reminder" alerts to his phone
Step 8: Shares Mom's profile with Dr. Mehra (read-only)
```

**Key Moments of Truth:**
- **Setup must be < 15 minutes** for both parents combined
- **Mom's phone must show reminders without her opening the app**
- **Rajesh must get alerts within 30 seconds** of a missed acknowledgment
- **Doctor must see structured data**, not raw images

---

### 3.3 Journey: Kamla Devi's Daily Medication Routine

```
7:00 AM  ──▶  📱 Alarm-style reminder rings
              "कमला जी, सुबह की दवाई का समय हो गया"
              [ले ली ✅]  [बाद में ⏰]  [छोड़ दी ❌]

         ──▶  Taps "ले ली" ──▶ Confetti animation + encouragement
         ──▶  If no response in 15 min ──▶ Second reminder
         ──▶  If no response in 30 min ──▶ Alert to Rajesh

8:00 AM  ──▶  🍳 Meal reminder: "नाश्ते का समय!"
9:30 AM  ──▶  💧 Water reminder: "एक गिलास पानी पी लीजिए"
```

---

## 4. Feature Prioritization (MoSCoW Framework)

### 4.1 Must Have (P0) — MVP Launch

| # | Feature | Rationale | Complexity |
|---|---|---|---|
| F1 | User Authentication (Email/Phone + OTP) | Core gate | Low |
| F2 | Document Upload (Camera + Gallery + PDF) | Core value prop | Medium |
| F3 | OCR Extraction Pipeline | Core value prop | High |
| F4 | AI Medical Report Summary | Key differentiator | High |
| F5 | Medicine Reminders (CRUD + Notifications) | Highest daily utility | Medium |
| F6 | Water Reminders (Configurable intervals) | High daily utility | Low |
| F7 | Meal Reminders (3 meals + snacks) | High daily utility | Low |
| F8 | Health Timeline (Chronological doc view) | Organization value | Medium |
| F9 | Family Member Management (Add/View) | Family use case | Medium |
| F10 | Basic Notifications (Push + In-app) | Reminder delivery | Medium |
| F11 | User Profile & Settings | Basic personalization | Low |

### 4.2 Should Have (P1) — V1.1

| # | Feature | Rationale | Complexity |
|---|---|---|---|
| F12 | Chatbot Assistant (FAQ + health queries) | Engagement + support | High |
| F13 | Doctor Sharing (Time-limited links) | Doctor adoption | Medium |
| F14 | Health Analytics (Trends, charts) | Insight from data | Medium |
| F15 | Multi-language Support (Hindi, Tamil, etc.) | Accessibility | Medium |
| F16 | Reminder Escalation to Family | Safety net | Medium |

### 4.3 Could Have (P2) — V2.0

| # | Feature | Rationale | Complexity |
|---|---|---|---|
| F17 | Wearable Device Integration | Richer health data | High |
| F18 | Appointment Booking | Convenience | High |
| F19 | Prescription Refill Reminders | Adherence | Medium |
| F20 | Community Health Tips | Engagement | Low |
| F21 | Emergency SOS | Safety | Medium |

### 4.4 Won't Have (This Year)

| # | Feature | Reason |
|---|---|---|
| F22 | Telemedicine Video Calls | Regulatory complexity, use integrations |
| F23 | Insurance Claims Processing | Requires insurance partnerships |
| F24 | EHR System Integration | Requires hospital IT partnerships |

---

## 5. MVP Scope Definition

### 5.1 MVP Feature Set

```
┌─────────────────────────────────────────────────┐
│                 MAATE MVP (v1.0)                │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │   Auth   │  │  Upload  │  │  OCR Engine  │  │
│  │  (OTP)   │  │  (Docs)  │  │  (Extract)   │  │
│  └──────────┘  └──────────┘  └──────────────┘  │
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Medicine │  │  Water   │  │    Meal      │  │
│  │ Reminder │  │ Reminder │  │  Reminder    │  │
│  └──────────┘  └──────────┘  └──────────────┘  │
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │  Health  │  │  AI      │  │   Family     │  │
│  │ Timeline │  │ Summary  │  │  Members     │  │
│  └──────────┘  └──────────┘  └──────────────┘  │
│                                                 │
│  ┌──────────┐  ┌──────────────────────────────┐ │
│  │  Push    │  │  User Profile & Settings     │ │
│  │  Notifs  │  │                               │ │
│  └──────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### 5.2 MVP Timeline

| Phase | Duration | Deliverable |
|---|---|---|
| Design & Architecture | Weeks 1-3 | Figma prototypes, DB schema, API specs |
| Core Backend (Auth, Upload, OCR) | Weeks 4-8 | Functional API, OCR pipeline |
| Reminder Engine | Weeks 6-9 | Medicine/Water/Meal reminders with push |
| AI Summary Engine | Weeks 8-11 | GPT-4o integration, summary templates |
| Mobile App (React Native) | Weeks 4-14 | iOS + Android app |
| Family Management | Weeks 10-13 | Family groups, member profiles |
| Health Timeline | Weeks 11-14 | Chronological document view |
| QA, Security Audit, Compliance | Weeks 14-17 | Pen testing, HIPAA checklist |
| Beta Launch (1000 users) | Week 18 | Closed beta |
| Public Launch | Week 22 | App Store + Play Store |

### 5.3 MVP Exit Criteria

- [ ] User can sign up via phone OTP in < 30 seconds
- [ ] Document upload + OCR extraction completes in < 15 seconds
- [ ] AI summary generated with > 90% accuracy on test set of 500 reports
- [ ] Medicine reminders fire within ±30 seconds of scheduled time
- [ ] Family member can view dependent's health timeline
- [ ] Push notifications delivered with > 98% reliability
- [ ] App cold start < 3 seconds on mid-range Android
- [ ] All API response times < 500ms (p95)
- [ ] Zero critical security vulnerabilities
- [ ] HIPAA/DPDP self-assessment passed
