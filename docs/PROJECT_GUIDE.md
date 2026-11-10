# Maate Project Guide

## 1. What this is and who it is for

Maate is a personal health management platform. It is meant to help patients, their families and healthcare providers keep medical information in one place. A user can upload medical documents such as lab reports and prescriptions, and the system reads the text from them, writes plain-language summaries, and keeps a timeline of their health history. Users can also set reminders for medicines, water and meals, ask an AI assistant questions about their own records, and give a doctor temporary access to selected records.

The owner describes it as "enterprise-grade" and built to meet two privacy rules: HIPAA (a United States health privacy law) and DPDP (India's data protection law). The material does not say how many people use it, whether it has paying customers, or whether it has been formally certified under either law. The README mentions a live web demo, and the repository's legal notice says "Maate Health" holds the rights.

This guide is for a manager or new collaborator who needs to understand what exists before reading any code. It is based only on the README, an automatically generated map of the code, and one-line notes on each file.

## 2. The big picture: the main parts

The project is kept in a single "monorepo" (one repository holding several related programs and shared tools). The parts are below.

**1. The web app** (`apps/web`)
This is the website people use in a browser. It has a login and sign-up area, a dashboard with health summaries, a document upload page, a health timeline, reminders, an AI chat page, a family page, and a profile page. It also has a public page where a doctor can open a shared link without an account. It can be installed on a phone or computer like an app and works partly offline (`apps/web/public`). It is built with Next.js and React, and the README says it is hosted on Vercel.

**2. The mobile app** (`apps/mobile`)
A phone app built with Expo (a tool for making iPhone and Android apps from one codebase). It covers much the same ground as the website: login (including fingerprint or face unlock), home dashboard, document upload and scan review, timeline, reminders, chat, analytics, family sharing, notifications and settings. Some mobile screens are noted as still using placeholder or sample data, namely the home screen and the prescription scan review screen.

**3. The backend API** (`apps/api`)
The "brain" that both apps talk to. An API is the set of doors the apps knock on to ask for or save information. It is written with NestJS. It is split into feature areas, each in its own folder under `apps/api/src`:
- Sign-in and account security (login, one-time codes, Google and Apple sign-in, two-factor login, password reset, session handling).
- Consent (records what each user has agreed to).
- Compliance (data export and account deletion).
- Documents (upload, status, summaries, archiving).
- Chat (the AI assistant).
- Timeline (the chronological health history).
- Health data (vitals, symptoms, chronic conditions, doctor notes, and dashboard figures).
- Reminders and notifications.
- Family (profiles for relatives and caregiver access).
- Doctor sharing (temporary links).
- User profile.
- Shared plumbing under `apps/api/src` for the database, the cache, file storage, audit logging, error formatting and request limits.

**4. The AI service** (`services/ai-service`)
A separate small program, written in Python, that does the AI work: turning text into searchable numbers, summarizing reports, and powering the chat assistant. See section 5.

**5. The text-reading (OCR) service** (`services/ocr-service`)
Another Python program. OCR means "optical character recognition", which is software that reads text from pictures of documents. It cleans up the image, reads the text with a tool called Tesseract, finds lab test names, values and units, and corrects common misreadings (for example, "mgidL" becomes "mg/dL").

**6. The database package** (`packages/database`)
Defines the structure of the database (the tables and fields) using a tool called Prisma, and holds the scripts that change that structure over time (migrations). It also contains a "seed" script that fills a development database with a sample user and reminders. A `scratch` folder holds developer-only clean-up scripts that the app itself does not use.

**7. Shared building blocks** (`packages/shared-types`, `packages/eslint-config`, `packages/tsconfig`)
Shared definitions so the web app, mobile app and API agree on the shape of the data they exchange, plus shared code-style and code-checking settings. These contain no product features.

**8. Deployment and operations** (`deploy`, `docker-compose*.yml`, `ci-templates`, `scripts`)
Files for running the system on a developer's computer, on a private test ("staging") server, and in production. They include container setups (Docker packages each program so it runs the same everywhere), automated build and test workflows, a nightly database backup script, and a smoke test (a quick end-to-end check that sign-up, login, upload, summary, chat and export all work).

**9. Planning documents** (`docs`, plus `PHASE*.md` files in the root)
Four product and design documents (vision, architecture, AI and compliance, roadmap and security) and several phase reports describing how features such as chat and notifications were built and tested.

Note: the README lists a `deploy` folder with `docker-compose.staging.yml` and `DEPLOY.md`, while the file notes show a `docker-compose.staging.yml` in the root. The material does not say whether both exist.

## 3. How the pieces work together: one typical journey

Here is what happens when a patient uploads a lab report and asks a question about it.

1. **Sign up.** The person creates an account on the website or phone app. They pick which uses of their data they agree to. Three choices exist: AI summaries, AI chat and general data processing. All are switched off by default. The person then enters a six-digit code sent by email to activate the account.

2. **Upload.** On the upload page they drag in a PDF or photo. The app sends the file straight to cloud file storage using a time-limited secure link, then tells the API the upload is finished.

3. **Queue.** The API records the document in the database and places a job in a queue (a waiting line for tasks that run in the background). This keeps the page responsive while slow work happens behind the scenes.

4. **Read the text.** A background worker asks the OCR service to read the document. The service cleans up the image, extracts the text, and picks out lab values and medicine names.

5. **Consent check and summary.** Before any AI work, the worker checks that the user has agreed to AI summaries. If so, it asks the AI service to write a plain-language summary. The AI service also flags values that look impossible, which could be scanning mistakes, so that the patient can check them. If the results look critical, the notes say the worker "escalates" them, though the material does not explain how.

6. **Make it searchable.** The worker stores the text in small pieces, each with a numerical "fingerprint" that captures its meaning. This is what allows searching by meaning later.

7. **Review.** The person sees the status change on screen, opens the report page, and reads the summary, key findings and a table of lab results. For prescriptions, they can correct the medicines the system found and save them to their reminder schedule.

8. **Ask a question.** In the chat page they type something like "What did my report say about hemoglobin?" The API checks their chat consent, finds the most relevant pieces of their own documents, adds some health details, and sends it all to the AI service for an answer.

9. **Share with a doctor.** The person creates a link that expires. The doctor opens it without an account, sees only the chosen records, and the patient is alerted that it was opened.

10. **Throughout.** Every viewing or change of sensitive health information is written to an audit log.

## 4. Where the data lives and how it gets in

**Main database (PostgreSQL).** This is the permanent home of user accounts, consents, documents' details, timeline events, vitals, symptoms, conditions, reminders, family links, share links, notifications and chat history. It has an add-on called pgvector, which stores the "fingerprints" used to search documents by meaning. The README names a few tables, such as `timeline_events`, `refresh_tokens` and `notifications`. The full list of tables is not in the material provided.

**Cache and queue store (Redis).** Redis is a very fast, temporary store. Here it holds one-time codes (valid for five minutes), cached timeline results, and the background job queues. A job dashboard (Bull Board) is included in the local setup for watching queues.

**File storage.** The actual uploaded files live in cloud object storage, not in the database. The code uses an S3-style storage library, and the local setup includes MinIO (a stand-in for cloud storage on a developer machine). The notes also mention Cloudflare storage for database backups. The material does not name the storage provider used in production.

**How data gets in:**
- Typed in by the user: profile details, vitals, symptoms, conditions, reminders, water intake, family members.
- Uploaded files: lab reports and prescriptions, which are read by OCR.
- Sign-in with Google or Apple, which links to or creates an account.
- Doctor notes can be created through the API.
- Sample data from the seed script, for development only.

The notes do not mention any connection to hospital systems, wearables or lab providers. A planning document is said to cover "standard health-data format mappings" (FHIR is named in a document title), but whether this was built is not clear.

**Backups and deletion.** A script backs up the staging database nightly, compresses it, uploads it to Cloudflare storage and deletes backups older than three days. When a user deletes their account, the README says the system erases or anonymizes related records and the stored files. The deletion requires the user's password and a typed confirmation phrase. Users can also request an export of their data.

## 5. The AI parts

All AI work sits in `services/ai-service`, with some supporting logic in the API.

- **Embeddings (meaning search).** A small local model (named `bge-small` in the README) turns text into numbers so that documents and questions can be compared by meaning. This runs on the project's own server rather than a paid outside service.
- **Report summaries.** The AI writes plain-language summaries of medical reports. It also flags values that look implausible, such as a likely scanning error, so the patient is asked to verify them. The web dashboard shows a summary with a "confidence level", key observations and next steps.
- **Chat assistant.** Answers questions using the patient's own records, suggests follow-up questions, and has a safety rule: messages that look like emergencies trigger a safety response instead of a normal answer. The README says this uses "Groq LLM" (a large language model, meaning a text-generating AI, run by an outside company called Groq). Which exact model is used is set in a configuration file that is not shown.
- **RAG.** This stands for retrieval-augmented generation. In plain terms, the system first looks up the most relevant pieces of the user's own documents, then gives them to the AI so its answer is based on real records rather than guesses.
- **Medical term extraction.** The OCR service uses simple pattern matching (not AI) to find lab test names, values, units and medicine names.
- **Planned cloud fallback.** The OCR engine has a planned fallback to a cloud reading service when confidence is low. The note calls it "planned", so it may not be working yet.
- **Sample data in the interface.** The "AI insights" card on the web dashboard shows sample insights, so it may not yet be connected to real analysis.

**Safeguards.** AI summaries and chat both require the user's consent first, and the tests check that consent is respected. Tests also check that impossible lab values are flagged and that emergency messages trigger the safety response. The material does not describe any review of AI answers by a clinician.

**A privacy point to confirm.** Since chat uses an outside language model, some of the user's health text is presumably sent to that provider. The material does not explain what is sent or what agreements are in place.

## 6. Glossary

- **API:** The set of requests an app can make to the backend to read or save data.
- **App Router:** The newer way Next.js organizes website pages by folder.
- **Argon2:** A method for scrambling passwords so the real password is never stored. (The README names it; one file note mentions bcrypt, so check which is used.)
- **Audit log:** A permanent record of who viewed or changed sensitive data and when.
- **BullMQ / Bull:** Tools that manage the background job queue.
- **Caddy:** A web server that handles secure connections on the staging server.
- **CI (continuous integration):** Automatic checks that run each time code is pushed.
- **Consent:** A user's recorded permission for a specific use of their data.
- **Docker / container:** A package holding a program and everything it needs so it runs the same anywhere.
- **DPDP:** India's Digital Personal Data Protection law.
- **Embedding:** A list of numbers representing the meaning of a piece of text.
- **Expo:** A toolkit for building phone apps.
- **HIPAA:** A United States law protecting health information.
- **JWT (login token):** A signed digital pass that proves who is signed in.
- **Migration:** A saved change to the database structure.
- **Monorepo:** One repository containing several related projects.
- **NestJS:** The framework used to build the backend API.
- **Next.js:** The framework used to build the website.
- **OCR:** Software that reads text from images.
- **OTP (one-time password):** A short code, here six digits, used once to verify identity.
- **PHI (protected health information):** Health data that can be tied to a person.
- **pgvector:** A PostgreSQL add-on that stores and searches embeddings.
- **Prisma:** The tool that defines and talks to the database.
- **PWA (progressive web app):** A website that can be installed and used partly offline.
- **RAG:** Looking up relevant records and giving them to the AI before it answers.
- **Redis:** A fast temporary data store.
- **Sentry:** A service that reports errors from the live app.
- **Staging:** A private copy of the system used to test before going live.
- **TOTP / two-factor login:** A time-based code from an authenticator app used as a second step at login.
- **Turborepo:** A tool that runs build and test tasks across the monorepo.

## 7. Where to start reading, and what to be careful with

**Start here:**
1. `README.md` for the overview and folder layout.
2. `docs/PRD_Part1_Product_Vision.md` for the intended product, then `PRD_Part2_Architecture.md` for the design.
3. `RUNBOOK.md` to see how to run everything locally.
4. `PHASE8_CHAT_RAG.md` and `PHASE9_NOTIFICATIONS.md` as examples of how a feature was built and tested.
5. For code, `apps/api/src/app.module.ts` shows how the backend features are wired together, and `apps/api/src` modules for documents, chat and consent show the main journey.

**Be careful with:**
- **Consent.** Many features depend on it. Changes near the AI processing or chat code could break privacy promises. The tests named `compliance-e2e.spec.ts` and `cross-user-isolation.spec.ts` guard these rules.
- **Cross-user access.** One person's records must never be visible to another, except through approved caregiver or doctor sharing. The access check (`jwt-auth.guard.ts`) lets caregivers act for family members, so changes here are sensitive.
- **Real health data.** Treat any copy of production data with the care that medical records require. The developer scripts in `packages/database/scratch` can delete users and are meant for manual use only.
- **Compliance claims.** The README states "HIPAA & DPDP-compliant". The material does not show any audit or certification, so avoid repeating this claim externally without confirmation.
- **Secrets and settings.** The API refuses to start without required secrets. Do not put real keys in the repository.
- **Medical safety.** Wrongly read lab values could mislead someone. The "impossible value" checks and emergency messages are safety features, so keep their tests passing.
- **Duplicates and leftovers.** Some files are noted as older duplicates (for example `send-otp.dto.ts`). Check before editing.
- **Staging deploys.** The staging workflow runs database migrations, which change real data structures, and requires typing a confirmation word.

## 8. Open questions

- **Users and scale.** How many people use it, and is it live with real patients or only a demo?
- **Compliance status.** Has any HIPAA or DPDP review been done? Which of the two does the product actually target first?
- **Password method.** The README says Argon2, but the backend dependency list includes bcrypt. Which is used?
- **Production hosting.** The web app is on Vercel. Where do the API, database, AI and OCR services run in production? The notes describe staging on a single server and a "VPS deployment guide" but not the production setup.
- **AI provider.** Which language model is used, what data is sent to Groq, and what agreements cover that?
- **Cloud OCR fallback.** Is it built, or still only planned?
- **Placeholder screens.** Which mobile and web screens still show sample data (the home screen, the scan review screen and the AI insights card are noted), and what is the plan to connect them?
- **Critical result escalation.** What happens when a document processor "escalates" a critical result?
- **Standard health-data formats.** Is FHIR support built or only planned?
- **Pricing.** A planning document mentions subscription pricing. Are there plans, and is billing implemented? None is visible in the file notes.
- **Roles.** The README mentions patients, families and healthcare providers. Doctors seem to view shared links only. Are there provider accounts?
- **Repository layout.** Is the `deploy` folder present, given the root-level staging file?
- **Emergency caregiver access.** The README mentions it. How does it work?
- **Test coverage.** Tests exist for key areas, but the material does not say how much is covered or whether they currently pass.
- **Dates.** The map is dated 2026-11-06 and built from one commit. Whether it matches the current code should be checked.