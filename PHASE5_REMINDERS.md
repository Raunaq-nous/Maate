# Phase 5 Deliverable: Reminders & Adherence Tracking

## Executive Summary
Phase 5 establishes the daily operational health companion loop in Maate. It delivers comprehensive scheduling, notification dispatching, adherence tracking, and history reporting for medicine, water hydration, and meal schedules across both web and mobile clients.

---

## 1. Step 0 Architecture & Audit Findings

### Medication vs. MedicineReminder
- **Medication (`apps/api/src/modules/medication/`)**: Represents clinical Electronic Health Record (EHR) data. Tracks clinical drug information (generic name, brand name, dosage, RxNorm/NDC identifiers, clinical interactions, contraindications, and prescribing doctors).
- **MedicineReminder (`apps/api/src/modules/reminder/`)**: Represents operational patient routine and adherence management. Stores schedules (`timesOfDay: ['07:00', '21:00']`), day-of-week recurrence (`daysOfWeek: [1, 2, 3, 4, 5, 6, 7]`), meal relationships (`BEFORE_MEAL`, `AFTER_MEAL`, `WITH_MEAL`), snoozing state, and adherence history (`ReminderLog`).
- **Design Decision**: The models are decoupled by design. Clinical EHR records do not require notification scheduling, while reminders do not require clinical pharmacy coding.

### Push Notification Infrastructure
- **Queue**: `@InjectQueue('notifications')` powered by Redis BullMQ (`bull`).
- **Processor**: `apps/api/src/modules/notification/notification.processor.ts` processes `send-push` and `send-email` jobs. Push dispatch utilizes the `expo-server-sdk` via `NotificationService`.
- **Database Entity**: Every push job creates a permanent `Notification` row in PostgreSQL (`status: PENDING/DELIVERED/FAILED`, `channel: PUSH`).
- **Mobile Client**: `apps/mobile/src/services/NotificationManager.ts` registers device push tokens via `POST /notifications/register-device` and sets up Expo interactive notification action listeners (`TAKE_MEDICINE`, `SNOOZE_REMINDER`, `SKIP_REMINDER`).

### Seeded Data Discovery
- **Test User**: Priya Sharma (`priya@example.com`, ID `947d1239-4c59-4ccd-8949-8f84f1f8d0ff`).
- **Seeded Reminders**:
  - 9 Medicine Reminders (`Metformin 500mg`, `Amlodipine 5mg`, `Atorvastatin 10mg`).
  - 1 Water Reminder (`2500ml` daily goal, `90 min` interval between `07:00` and `21:00`).
  - 9 Meal Reminders (`Breakfast 08:00`, `Lunch 13:00`, `Dinner 19:30`).
- **Local Password Note**: `packages/database/src/seed.ts` intentionally seeded `passwordHash: null`. For live verification, a standard bcrypt hash for `Password123!` was injected directly into the local PostgreSQL `maate_dev` database row for Priya Sharma. `packages/database/src/seed.ts` was **100% preserved and untouched**.

---

## 2. Scheduling Engine & Timezone Handling

### 5-Minute Window Generation Engine
- **Cron**: `@Cron(CronExpression.EVERY_MINUTE)` runs `ReminderSchedulerService.scheduleUpcomingReminders()`.
- **Scanning Window**: Scans all active reminders from `T + 1 min` to `T + 5 min`.
- **Deduplicated Job IDs**: Previous job IDs formatted `new Date()` (the scan execution minute), causing duplicates if scanned multiple times in the sliding window. Job IDs now format the target scheduled date string: `${jobData.type}_${jobData.reminderId}_${format(scheduledDate, 'yyyyMMddHHmm')}`. BullMQ automatically deduplicates identical job IDs.

### Timezone Conversion & Wall-Clock Accuracy
- `User.timezone` (defaults to `'Asia/Kolkata'` = UTC+05:30).
- Handled via `date-fns-tz`: `toZonedTime(new Date(), user.timezone)` converts current system time to user wall-clock time before matching scheduled times (`HH:mm`).
- Delays are calculated precisely as `scheduledDate.getTime() - userTime.getTime()` (in milliseconds) and enqueued with BullMQ delay options.

### Days-of-Week Recurrence Filtering
- Evaluated via `getISODay(userTime)` from `date-fns` (1 = Monday, ..., 7 = Sunday).
- Reminders configured with specific `daysOfWeek` (e.g. `[1, 2]` for Mon/Tue) are automatically skipped if current day does not match. Tested and verified against active vs off-day test cases.

### Hydration (Water) Interval Scheduling
- Implemented real interval generation in `ReminderSchedulerService.scheduleWaterReminders()`:
  - Parses `activeStart` (e.g. `07:00`) and `activeEnd` (e.g. `21:00`).
  - Iterates by `intervalMinutes` (e.g. 90 mins).
  - Matches points falling inside the 5-minute sliding window and enqueues hydration jobs with exact delay and `Hydration Reminder 💧` messaging.

---

## 3. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/reminders/active` | Retrieves all active medicine, water, meal reminders & today's logs |
| `POST` | `/reminders` | Creates a new medicine reminder (supports `daysOfWeek`) |
| `PUT` | `/reminders/medicine/:id` | Updates an existing medicine reminder (dosage, instructions, schedule, days) |
| `PUT` | `/reminders/meal/:id` | Updates an existing meal reminder (time, notes, mealType) |
| `PUT` | `/reminders/:id` | Fallback reminder update |
| `POST` | `/reminders/water` | Upserts water reminder settings (goal, intervals, glass size) |
| `POST` | `/reminders/meal` | Creates a new meal reminder |
| `DELETE` | `/reminders/:id` | Soft deletes medicine reminder / removes meal reminder |
| `POST` | `/reminders/:type/:id/log` | Records adherence response (`TAKEN`, `SKIPPED`, `SNOOZED`) |
| `GET` | `/reminders/history` | Retrieves paginated adherence history with date & reminder filters |
| `GET` | `/reminders/stats/adherence` | Calculates adherence percentage and total taken count |

---

## 4. Mobile Client Integration (`apps/mobile`)

- **Screen**: `apps/mobile/src/app/(tabs)/reminders.tsx`
- **Dynamic State**: Replaced all hardcoded constants (`medicines`, `1,800 ml of 2,500 ml`, static meals) with `apiClient.get('/reminders/active')`.
- **Live Adherence Actions**:
  - Medicine: Status badges computed from today's logs (`Taken ✅`, `Snoozed`, `Upcoming`). Action buttons to "Mark Taken" and "Snooze" call `POST /reminders/medicine/:id/log`.
  - Hydration: Water progress bar and intake numbers are computed dynamically from today's `WATER` logs multiplied by `glassSizeMl`. One-tap "Log Water (+250ml)" button records intake.
  - Meals: Shows upcoming meals and provides "Mark Eaten" adherence action.
  - Pull-to-Refresh: Integrated `RefreshControl` for immediate sync.

---

## 5. End-to-End Live Verification Results

The automated end-to-end verification script (`scratch/test_phase5_reminders.py`) executed live against PostgreSQL, Redis BullMQ, and the NestJS API with 100% success:

1. **Authentication**: Logged in as Priya Sharma (`priya@example.com`), confirmed `Asia/Kolkata` timezone.
2. **Push Token**: Registered device push token (`ExponentPushToken[TestPhase5Token12345]`).
3. **Timezone Calculation**: UTC `09:34:16` translated to Kolkata `15:04:16`. Target time set to `15:06`.
4. **Creation & Update**: Created `Vitamin D3 Test 60k` for `15:06` with `daysOfWeek: [3]` (Wednesday). Updated dosage and instructions via `PUT /reminders/medicine/:id`.
5. **Day-of-Week Recurrence**: Created control reminder with `daysOfWeek: [1]` (Monday). Verified on BullMQ scan: active Wednesday reminder was enqueued with `101704ms` delay; off-day control reminder was ignored.
6. **BullMQ Processing**: Job processed by `ReminderProcessor`. Verified PostgreSQL record creation:
   - `Notification`: Created with PUSH channel, title `Medicine Reminder 💊`, status `PENDING`.
   - `ReminderLog`: Created with `scheduledAt` and `deliveredAt`.
7. **Adherence Logging**: Marked reminder as `TAKEN` via `POST /reminders/medicine/:id/log` with note `Taken on time with milk`.
8. **History & Stats**: `GET /reminders/history` retrieved the log with full metadata; `GET /reminders/stats/adherence` confirmed `adherenceRate: 100%`.
9. **Water Scheduling**: Verified `scheduleWaterReminders` dynamically generated interval reminders, enqueuing `Hydration Reminder 💧` jobs in Redis BullMQ.
10. **Clean Up**: Successfully deleted test reminders.

---

## 6. Standing Verification Suite
- `pnpm run lint`: 0 errors
- `pnpm run typecheck`: 0 errors across all 7 workspace packages
- `pnpm run format:check`: 100% formatted
- `pnpm run test:ci`: 100% passing tests
- `pnpm run build`: 100% clean builds for `@maate/api`, `@maate/web`, `@maate/database`, `@maate/shared-types`, `@maate/mobile`
