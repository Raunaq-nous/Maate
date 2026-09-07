# Phase 7: Family Caregiving & Doctor Sharing

## Overview
Phase 7 implements collaborative family caregiving and secure doctor sharing across the Maate platform. It establishes role-based caregiver delegation, proxy record management with HIPAA/DPDP-compliant audit trails, and a dedicated, rate-limited clinical consultation portal for physicians to access structured medical records without a Maate login account.

---

## 1. Architectural Resolution: Family Models

### `FamilyMember` / `AccessPermission` (Active Canonical Model)
- **Model Role**: Represents individual managed dependent profiles under an account owner (e.g. parents, children) and 1-to-1 caregiver access grants with explicit permission levels (`VIEW`, `EDIT`, `FULL`, `EMERGENCY`).
- **Deep Integration**:
  - `JwtAuthGuard` natively inspects `x-patient-id` headers and queries `FamilyMember` and `AccessPermission` to authenticate proxy requests.
  - Multi-profile switching in web (`profile-switcher.tsx`) and mobile (`familyStore.ts`) runs on this model.
- **Shadow User Credential Security**: Shadow `User` records created alongside `FamilyMember` profiles are data-only entities with `email: null`, `phone: null`, and `passwordHash: null`. They possess **zero login credentials** and cannot be authenticated directly.

### `FamilyGroup` / `FamilyGroupMember` (Dead Weight)
- **Status**: An unreferenced legacy multi-tenant group schema draft with 0 backend endpoints and 0 UI usage.
- **Decision**: Preserved in schema to avoid breaking migrations; flagged for future cleanup.

---

## 2. DoctorShare Security & Compliance Design

### Data Model & Token Generation
- **Model**: `DoctorShare` in PostgreSQL (`doctor_shares`).
- **Token Generation**: Cryptographically secure 64-character hexadecimal tokens generated via `crypto.randomBytes(32).toString('hex')` (~256 bits of entropy).
- **Time-Limited Expiry**: Configurable expiration (`expiresInDays`, default 7 days, max 90 days).
- **Instant Revocation**: `isRevoked: true` flag checked on every request; immediately terminates external access.
- **Resource Scoping**: Strict filtering via `sharedResources: string[]` (`lab_reports`, `prescriptions`, `vitals`, `timeline`). Unshared categories are omitted from responses.
- **Defense-in-Depth Rate Limiting**: The public clinician portal (`GET /api/v1/share/doctor/view/:token`) is rate-limited via `@nestjs/throttler` (`limit: 20` requests/minute per IP).

### Compliance Audit Logging (`AuditService`)
Every security-sensitive operation writes immutable records to `audit_logs`:
1. **Caregiver Proxy Access**: `action: PHI_VIEW`, `resource: ProxyCaregiverAccess`, capturing caregiver user ID, patient profile ID, endpoint, IP address, and user agent.
2. **Access Delegation & Revocation**: `action: ACCESS_GRANTED` and `ACCESS_REVOKED` on `AccessPermission` and `DoctorShare`.
3. **Doctor Record Access**: `action: PHI_VIEW`, `resource: DoctorShare`, tracking token view count, doctor name, and scoped resources accessed.

---

## 3. Endpoints Implemented & Extended

### Family Module (`apps/api/src/modules/family/`)
| Method | Endpoint | Description | Compliance Audit |
|---|---|---|---|
| `POST` | `/api/v1/family/members` | Add managed dependent profile | `PHI_CREATE` (`FamilyMember`) |
| `GET` | `/api/v1/family/profiles` | List owned and shared profiles | — |
| `DELETE` | `/api/v1/family/members/:id` | Delete managed family profile | `PHI_DELETE` (`FamilyMember`) |
| `POST` | `/api/v1/family/members/:id/share` | Delegate caregiver access | `ACCESS_GRANTED` (`AccessPermission`) |
| `GET` | `/api/v1/family/members/:id/caregivers` | List authorized caregivers | — |
| `DELETE` | `/api/v1/family/members/:id/caregivers/:granteeId` | Revoke caregiver delegation | `ACCESS_REVOKED` (`AccessPermission`) |
| `GET` | `/api/v1/family/members/:id/permissions` | Check caller permissions | — |

### Share Module (`apps/api/src/modules/share/`)
| Method | Endpoint | Auth | Description | Compliance Audit |
|---|---|---|---|---|
| `POST` | `/api/v1/share/doctor` | JWT | Create time-limited doctor share link | `ACCESS_GRANTED` (`DoctorShare`) |
| `GET` | `/api/v1/share/doctor` | JWT | List active & past doctor share links | — |
| `PATCH` | `/api/v1/share/doctor/:id/revoke` | JWT | Instantly revoke share token | `ACCESS_REVOKED` (`DoctorShare`) |
| `DELETE` | `/api/v1/share/doctor/:id` | JWT | Revoke share link | `ACCESS_REVOKED` (`DoctorShare`) |
| `GET` | `/api/v1/share/doctor/view/:token` | **Public** (`@Public()`, Rate-Limited) | Clinician consultation view | `PHI_VIEW` (`DoctorShare`) |

---

## 4. Frontend Web & Mobile Implementations

### Web Applications (`apps/web`)
1. **Family Vault Dashboard** (`/family`):
   - Connected to live `GET /family/profiles`, `POST /family/members`, and `DELETE /family/members/:id`.
   - Doctor Share generation modal with share link copy utility.
2. **Caregiver & Doctor Permissions** (`/family/permissions`):
   - Active doctor consultation links list with access count, expiration status, and one-click revocation.
   - Caregiver delegation modal mapping profiles to registered users.
3. **Public Clinician Portal** (`/shared/doctor/[token]`):
   - Dedicated consultation screen outside authenticated shell.
   - Displays patient demographics, OCR lab parameters with reference ranges, AI synthesis summaries, active prescriptions, and vitals history.

### Mobile Application (`apps/mobile`)
- **`apps/mobile/src/store/familyStore.ts`** & **`apps/mobile/src/app/family/index.tsx`**:
  - Live profile fetching, profile creation, and caregiver delegation.

---

## 5. End-to-End Live Verification Evidence

Live verification script `scratch/test_phase7_sharing.py` executed against Priya Sharma (`priya@example.com`) and Rajesh Sharma (`rajesh@example.com`):

```text
=================================================================
 PHASE 7 E2E LIVE VERIFICATION: FAMILY CAREGIVING & DOCTOR SHARE
=================================================================

1. Authenticating as Priya Sharma (priya@example.com)...
   Authenticated Priya: id=1d91389c-15d8-42ad-b99a-0fd2b544d8f1

2. Authenticating as Rajesh Sharma (rajesh@example.com)...
   Authenticated Rajesh: id=67e0c598-8ddc-4df7-b879-ad46ad21c157

3. Adding managed family profile (Kamla Devi, PARENT)...
   Created managed member profile: id=8cf795e7-f497-4ab2-a977-da0fc1da2daf, name=Kamla Devi

4. Delegating Caregiver Access for Kamla Devi to Rajesh (67e0c598-8ddc-4df7-b879-ad46ad21c157)...
   Access granted: accessLevel=VIEW

5. Querying caregivers list for Kamla Devi (GET /family/members/:id/caregivers)...
   Caregiver verified: Rajesh Sharma (rajesh@example.com) with VIEW access

6. Verifying Rajesh sees Kamla Devi in GET /family/profiles...
   Verified Rajesh has access to shared profile: ['Kamla Devi']

7. Testing Caregiver Proxy Access: Rajesh querying timeline for Kamla Devi with x-patient-id header...
   Proxy access successful! Events returned: 0

8. Testing Security: Rajesh attempting unauthorized proxy access with arbitrary UUID...
   VERIFIED: Unauthorized proxy header correctly blocked with 403 Forbidden.

9. Generating DoctorShare Token for Dr. Mehra (POST /share/doctor)...
   Created DoctorShare: id=64e781bf-e3bd-4a53-8fce-91d24eaa6113, token=92ae7a5fd302d855..., expiresAt=2026-09-14T10:47:32.826Z

10. Querying active doctor shares (GET /share/doctor)...
   Active shares count: 3

11. Accessing patient data via public token endpoint (GET /share/doctor/view/:token) WITHOUT JWT...
   Doctor Portal Payload Received for Priya Sharma:
     - Doctor: Dr. Arvind Mehra
     - Scoped Resources: ['lab_reports', 'prescriptions', 'vitals', 'timeline']
     - Active Medications count: 3
     - Recent Vitals count: 0

12. Revoking Doctor Share Link (PATCH /share/doctor/:id/revoke)...
   Share token revoked.

13. Re-attempting public access with revoked token...
   VERIFIED: Revoked token cleanly rejected with 403: This share link has been revoked by the patient

14. Testing Expired Token Rejection...
   VERIFIED: Expired token cleanly rejected with 403: This share link has expired. Please ask the patient for a new link.

15. Checking compliance AuditLog entries for PHI views, access grants, and revocations...
   Audit log records:
     ACCESS_GRANTED | DoctorShare | INFO | 2026-09-07 10:47:32.903+00
     ACCESS_REVOKED | DoctorShare | WARN | 2026-09-07 10:47:32.886+00
     PHI_VIEW | DoctorShare | INFO | 2026-09-07 10:47:32.867+00
     ACCESS_GRANTED | DoctorShare | INFO | 2026-09-07 10:47:32.834+00
     PHI_VIEW | ProxyCaregiverAccess | INFO | 2026-09-07 10:47:32.796+00
     ACCESS_GRANTED | AccessPermission | INFO | 2026-09-07 10:47:32.753+00

   VERIFIED: Comprehensive compliance audit trail established for all caregiver & clinician access!

16. Cleaning up test data...
   Cleaned up test family member and caregiver delegation.

=================================================================
 🎉 ALL PHASE 7 E2E VERIFICATION CHECKS PASSED WITH 100% SUCCESS!
=================================================================
```

---

## 6. Monorepo Quality Gate Status
- `pnpm install`: Clean
- `pnpm run lint`: 0 errors
- `pnpm run typecheck`: 7/7 packages clean
- `pnpm run format:check`: 100% formatted
- `pnpm run test:ci`: All test suites passing
- `pnpm run build`: Full monorepo production build succeeded
