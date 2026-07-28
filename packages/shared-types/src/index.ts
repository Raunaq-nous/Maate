// ============================================
// @maate/shared-types — API Contract Types
// Single source of truth for all API shapes
// ============================================

// ─── Common ─────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
  message?: string;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
  details?: Record<string, string[]>;
  timestamp: string;
  path: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ─── Auth ───────────────────────────────────

export type UserRoleEnum = 'PATIENT' | 'CAREGIVER' | 'FAMILY_ADMIN' | 'DOCTOR' | 'ADMIN';
export type AuthProviderEnum = 'EMAIL' | 'PHONE' | 'GOOGLE' | 'APPLE';

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  deviceName?: string;
  deviceOS?: string;
}

export interface SendOtpRequest {
  phone?: string;
  email?: string;
}

export interface VerifyOtpRequest {
  phone?: string;
  email?: string;
  otp: string;
}

export interface OAuthLoginRequest {
  provider: 'google' | 'apple';
  idToken: string;
  authorizationCode?: string;
  fullName?: string;
  deviceName?: string;
}

export interface BiometricRegisterRequest {
  biometricKey: string;
  deviceName?: string;
}

export interface BiometricLoginRequest {
  signature: string;
  sessionId: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse extends AuthTokens {
  user: UserProfile;
  isNewUser: boolean;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface UserSession {
  id: string;
  deviceName: string | null;
  deviceOS: string | null;
  ipAddress: string | null;
  lastActiveAt: string;
  createdAt: string;
}

export interface RevokeSessionRequest {
  sessionId: string;
}

// ─── User ───────────────────────────────────

export interface UserProfile {
  id: string;
  phone: string | null;
  email: string | null;
  fullName: string;
  dateOfBirth: string | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
  bloodGroup: string | null;
  avatarUrl: string | null;
  locale: string;
  timezone: string;
  onboardingDone: boolean;
  createdAt: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  bloodGroup?: string;
  locale?: string;
  timezone?: string;
}

// ─── Document ───────────────────────────────

export type DocumentTypeEnum =
  | 'LAB_REPORT'
  | 'PRESCRIPTION'
  | 'DISCHARGE_SUMMARY'
  | 'IMAGING'
  | 'INSURANCE'
  | 'VACCINATION'
  | 'OTHER';

export type ProcessingStatusEnum = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface GetUploadUrlRequest {
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  documentType: string;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  fileKey: string;
  expiresIn: number;
}

export interface ConfirmUploadRequest {
  fileKey: string;
  documentType: string;
  title?: string;
  providerName?: string;
  doctorName?: string;
}

export interface MedicationEntity {
  name: string;
  dosage?: string;
  timing?: string;
  duration?: string;
  frequency?: string;
  instructions?: string;
}

export interface PrescriptionExtraction {
  doctor_name?: string;
  clinic_name?: string;
  diagnosis?: string;
  prescription_date?: string;
  medications: MedicationEntity[];
  icd_codes: string[];
  confidence_score: number;
}

export interface DocumentProfile {
  id: string;
  userId: string;
  title: string | null;
  documentType: string;
  fileUrl: string;
  ocrStatus: string;
  aiSummaryStatus: string;
  createdAt: string;
}

export interface DocumentResponse {
  id: string;
  title: string | null;
  documentType: DocumentTypeEnum;
  fileUrl: string;
  fileType: string | null;
  ocrStatus: ProcessingStatusEnum;
  aiSummaryStatus: ProcessingStatusEnum;
  tags: string[];
  documentDate: string | null;
  providerName: string | null;
  doctorName: string | null;
  createdAt: string;
}

export interface UploadDocumentRequest {
  documentType: DocumentTypeEnum;
  documentDate?: string;
  providerName?: string;
  doctorName?: string;
  tags?: string[];
}

export interface OcrResultResponse {
  id: string;
  rawText: string | null;
  structuredData: Record<string, unknown> | null;
  confidenceScore: number | null;
  engineUsed: string | null;
  processingTimeMs: number | null;
}

export interface AiSummaryResponse {
  id: string;
  summaryText: string;
  keyFindings: KeyFinding[];
  riskFlags: RiskFlag[];
  modelUsed: string | null;
}

export interface KeyFinding {
  parameter: string;
  value: string;
  status: 'normal' | 'low' | 'high' | 'critical';
  note: string;
}

export interface RiskFlag {
  parameter: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  recommendation: string;
}

// ─── Reminders ──────────────────────────────

export type ReminderFrequencyEnum =
  | 'ONCE_DAILY'
  | 'TWICE_DAILY'
  | 'THRICE_DAILY'
  | 'FOUR_TIMES'
  | 'WEEKLY'
  | 'CUSTOM';

export interface CreateMedicineReminderRequest {
  medicineName: string;
  dosage?: string;
  frequency: ReminderFrequencyEnum;
  timesOfDay: string[];
  daysOfWeek?: number[];
  mealRelation?: 'BEFORE_MEAL' | 'AFTER_MEAL' | 'WITH_MEAL' | 'ANY';
  startDate: string;
  endDate?: string;
  instructions?: string;
  snoozeMinutes?: number;
  escalateAfter?: number;
}

export interface MedicineReminderResponse {
  id: string;
  medicineName: string;
  dosage: string | null;
  frequency: ReminderFrequencyEnum;
  timesOfDay: string[];
  daysOfWeek: number[];
  mealRelation: string;
  startDate: string;
  endDate: string | null;
  instructions: string | null;
  isActive: boolean;
}

export interface WaterReminderConfig {
  dailyGoalMl: number;
  intervalMinutes: number;
  activeStart: string;
  activeEnd: string;
  glassSizeMl: number;
  isActive: boolean;
}

export interface WaterIntakeLog {
  amountMl: number;
  timestamp: string;
}

export interface WaterIntakeSummary {
  totalMl: number;
  goalMl: number;
  percentage: number;
  glassCount: number;
  logs: WaterIntakeLog[];
}

export interface CreateMealReminderRequest {
  mealType: 'BREAKFAST' | 'LUNCH' | 'SNACK' | 'DINNER';
  scheduledTime: string;
  dietaryNotes?: string;
}

export interface LogReminderRequest {
  response: 'TAKEN' | 'SKIPPED' | 'SNOOZED';
  notes?: string;
}

// ─── Health Timeline ────────────────────────

export interface TimelineEntry {
  id: string;
  type: 'document' | 'reminder_log' | 'health_record';
  date: string;
  title: string;
  subtitle: string | null;
  metadata: Record<string, unknown>;
}

// ─── Health Analytics ───────────────────────

export interface TrendDataPoint {
  date: string;
  value: number;
  unit: string;
  status: 'normal' | 'low' | 'high' | 'critical';
}

export interface ParameterTrend {
  parameterName: string;
  loincCode: string | null;
  unit: string;
  referenceMin: number | null;
  referenceMax: number | null;
  dataPoints: TrendDataPoint[];
}

export interface AdherenceStats {
  period: string;
  totalReminders: number;
  taken: number;
  skipped: number;
  missed: number;
  adherenceRate: number;
}

// ─── Family ─────────────────────────────────

export interface CreateFamilyGroupRequest {
  name: string;
}

export interface AddFamilyMemberRequest {
  phone?: string;
  email?: string;
  role: 'CAREGIVER' | 'MEMBER' | 'DEPENDENT';
  relationship?: string;
  canView?: boolean;
  canEdit?: boolean;
  canManageReminders?: boolean;
}

export interface FamilyGroupResponse {
  id: string;
  name: string;
  members: FamilyMemberResponse[];
  createdAt: string;
}

export interface FamilyMemberResponse {
  id: string;
  userId: string;
  fullName: string;
  role: string;
  relationship: string | null;
  canView: boolean;
  canEdit: boolean;
  canManageReminders: boolean;
}

// ─── Doctor Share ───────────────────────────

export interface CreateShareRequest {
  doctorName?: string;
  doctorEmail?: string;
  doctorPhone?: string;
  expiresInDays?: number;
}

export interface DoctorShareResponse {
  id: string;
  shareToken: string;
  shareUrl: string;
  doctorName: string | null;
  accessLevel: string;
  expiresAt: string;
  accessedCount: number;
}

// ─── Chat ───────────────────────────────────

export interface CreateChatSessionRequest {
  contextType?: 'general' | 'document_specific' | 'health_query';
  contextRefId?: string;
}

export interface SendMessageRequest {
  content: string;
}

export interface ChatMessageResponse {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// ─── Notifications ──────────────────────────

export interface RegisterDeviceRequest {
  fcmToken?: string;
  apnsToken?: string;
  platform: 'ios' | 'android' | 'web';
}

export interface NotificationResponse {
  id: string;
  type: string;
  channel: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  status: string;
  readAt: string | null;
  createdAt: string;
}
