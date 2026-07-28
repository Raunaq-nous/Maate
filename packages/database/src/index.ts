// ============================================
// @maate/database — Public API
// Re-exports Prisma client and types
// ============================================

export { PrismaClient } from './generated/client/index.js';
export type {
  AiSummary,
  AuditLog,
  ChatMessage,
  ChatSession,
  Document,
  DoctorShare,
  FamilyGroup,
  FamilyGroupMember,
  HealthRecord,
  MealReminder,
  MedicineReminder,
  Notification,
  OcrResult,
  Prisma,
  ReminderLog,
  User,
  WaterReminder,
  FamilyMember,
  AccessPermission,
} from './generated/client/index.js';

export {
  ChatRole,
  DocumentType,
  FamilyRole,
  Gender,
  HealthStatus,
  MealRelation,
  MealType,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  ProcessingStatus,
  ReminderFrequency,
  ReminderResponse,
  ReminderType,
  TimelineEventType,
  Severity,
  VitalType,
  MedicationStatus,
  ConditionStatus,
  AuthProvider,
  MfaType,
  RelationshipType,
  AccessLevel,
} from './generated/client/index.js';

