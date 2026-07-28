-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PATIENT', 'CAREGIVER', 'FAMILY_ADMIN', 'DOCTOR', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('EMAIL', 'PHONE', 'GOOGLE', 'APPLE');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('LAB_REPORT', 'PRESCRIPTION', 'DISCHARGE_SUMMARY', 'IMAGING', 'INSURANCE', 'VACCINATION', 'DOCTOR_NOTE', 'REFERRAL', 'CONSENT_FORM', 'OTHER');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReminderFrequency" AS ENUM ('ONCE_DAILY', 'TWICE_DAILY', 'THRICE_DAILY', 'FOUR_TIMES', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MealRelation" AS ENUM ('BEFORE_MEAL', 'AFTER_MEAL', 'WITH_MEAL', 'EMPTY_STOMACH', 'ANY');

-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'SNACK', 'DINNER');

-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('MEDICINE', 'WATER', 'MEAL', 'APPOINTMENT', 'VITAL_CHECK');

-- CreateEnum
CREATE TYPE "ReminderResponse" AS ENUM ('TAKEN', 'SKIPPED', 'SNOOZED', 'MISSED');

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('NORMAL', 'LOW', 'HIGH', 'CRITICAL', 'BORDERLINE');

-- CreateEnum
CREATE TYPE "FamilyRole" AS ENUM ('ADMIN', 'CAREGIVER', 'MEMBER', 'DEPENDENT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('REMINDER', 'ALERT', 'INFO', 'ESCALATION', 'SYSTEM', 'ACHIEVEMENT');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('PUSH', 'SMS', 'IN_APP', 'EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'READ');

-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "VitalType" AS ENUM ('BLOOD_PRESSURE', 'HEART_RATE', 'TEMPERATURE', 'BLOOD_OXYGEN', 'BLOOD_SUGAR', 'WEIGHT', 'HEIGHT', 'BMI', 'RESPIRATORY_RATE', 'STEPS', 'SLEEP_HOURS');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('MILD', 'MODERATE', 'SEVERE', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ConditionStatus" AS ENUM ('ACTIVE', 'REMISSION', 'RESOLVED', 'RECURRING');

-- CreateEnum
CREATE TYPE "TimelineEventType" AS ENUM ('DOCUMENT_UPLOADED', 'LAB_RESULT', 'PRESCRIPTION_ADDED', 'MEDICATION_STARTED', 'MEDICATION_STOPPED', 'VITAL_RECORDED', 'SYMPTOM_REPORTED', 'CONDITION_DIAGNOSED', 'CONDITION_RESOLVED', 'APPOINTMENT', 'DOCTOR_VISIT', 'HOSPITALIZATION', 'VACCINATION', 'SURGERY', 'AI_INSIGHT', 'MILESTONE');

-- CreateEnum
CREATE TYPE "MedicationStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'DISCONTINUED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('SELF', 'SPOUSE', 'PARENT', 'CHILD', 'SIBLING', 'GRANDPARENT', 'OTHER');

-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('VIEW', 'EDIT', 'FULL', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "MfaType" AS ENUM ('NONE', 'TOTP', 'SMS', 'EMAIL');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "phone" VARCHAR(15),
    "email" VARCHAR(255),
    "password_hash" VARCHAR(255),
    "full_name" VARCHAR(100) NOT NULL,
    "date_of_birth" DATE,
    "gender" "Gender",
    "blood_group" VARCHAR(5),
    "avatar_url" TEXT,
    "locale" VARCHAR(10) NOT NULL DEFAULT 'en-IN',
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    "role" "UserRole" NOT NULL DEFAULT 'PATIENT',
    "height_cm" DOUBLE PRECISION,
    "weight_kg" DOUBLE PRECISION,
    "emergency_contact" VARCHAR(15),
    "allergies_json" JSONB,
    "onboarding_done" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "fcm_token" TEXT,
    "apns_token" TEXT,
    "last_login_at" TIMESTAMPTZ,
    "login_count" INTEGER NOT NULL DEFAULT 0,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "provider_id" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "display_name" VARCHAR(100),
    "avatar_url" TEXT,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_expiry" TIMESTAMPTZ,
    "raw_profile" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "oauth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "family" VARCHAR(36) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "user_agent" VARCHAR(500),
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "device_name" VARCHAR(100),
    "device_os" VARCHAR(30),
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "last_active_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "biometric_key" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_resets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" VARCHAR(128) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "uploaded_by" UUID,
    "title" VARCHAR(255),
    "document_type" "DocumentType" NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_type" VARCHAR(10),
    "file_size_bytes" BIGINT,
    "checksum" VARCHAR(64),
    "encryption_key_id" VARCHAR(64),
    "ocr_status" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "ai_summary_status" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "document_date" DATE,
    "provider_name" VARCHAR(255),
    "doctor_name" VARCHAR(255),
    "fhir_doc_ref_id" VARCHAR(64),
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ocr_results" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "rawText" TEXT,
    "structured_data" JSONB,
    "confidence_score" DOUBLE PRECISION,
    "engine_used" VARCHAR(30),
    "engine_version" VARCHAR(20),
    "processing_time_ms" INTEGER,
    "page_count" INTEGER,
    "language_detected" VARCHAR(10),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ocr_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_summaries" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "summary_text" TEXT NOT NULL,
    "key_findings" JSONB,
    "risk_flags" JSONB,
    "recommendations" JSONB,
    "layperson_summary" TEXT,
    "model_used" VARCHAR(50),
    "model_version" VARCHAR(20),
    "prompt_tokens" INTEGER,
    "completion_tokens" INTEGER,
    "cost_usd" DOUBLE PRECISION,
    "latency_ms" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_reports" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "document_id" UUID,
    "report_name" VARCHAR(255) NOT NULL,
    "lab_name" VARCHAR(255),
    "ordered_by" VARCHAR(255),
    "collection_date" DATE,
    "report_date" DATE NOT NULL,
    "overall_status" "HealthStatus" NOT NULL DEFAULT 'NORMAL',
    "fhir_diag_report_id" VARCHAR(64),
    "notes" TEXT,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "lab_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_parameters" (
    "id" UUID NOT NULL,
    "lab_report_id" UUID NOT NULL,
    "parameter_name" VARCHAR(100) NOT NULL,
    "value" VARCHAR(50) NOT NULL,
    "unit" VARCHAR(30),
    "reference_min" DOUBLE PRECISION,
    "reference_max" DOUBLE PRECISION,
    "reference_range" VARCHAR(50),
    "status" "HealthStatus" NOT NULL DEFAULT 'NORMAL',
    "is_abnormal" BOOLEAN NOT NULL DEFAULT false,
    "loinc_code" VARCHAR(20),
    "snomed_code" VARCHAR(20),
    "method" VARCHAR(50),
    "notes" TEXT,

    CONSTRAINT "lab_parameters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imaging_reports" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "document_id" UUID,
    "modality" VARCHAR(30) NOT NULL,
    "body_part" VARCHAR(100) NOT NULL,
    "indication" VARCHAR(500),
    "findings" TEXT,
    "impression" TEXT,
    "radiologist_name" VARCHAR(255),
    "facility_name" VARCHAR(255),
    "study_date" DATE NOT NULL,
    "dicom_study_uid" VARCHAR(128),
    "fhir_imag_study_id" VARCHAR(64),
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "imaging_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "prescription_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "generic_name" VARCHAR(255),
    "brand_name" VARCHAR(255),
    "dosage" VARCHAR(100) NOT NULL,
    "dosage_unit" VARCHAR(20),
    "form" VARCHAR(30),
    "route" VARCHAR(30),
    "frequency" "ReminderFrequency" NOT NULL,
    "times_of_day" TEXT[],
    "meal_relation" "MealRelation" NOT NULL DEFAULT 'ANY',
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "status" "MedicationStatus" NOT NULL DEFAULT 'ACTIVE',
    "instructions" TEXT,
    "side_effects" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rxcui" VARCHAR(20),
    "ndc_code" VARCHAR(20),
    "snomed_code" VARCHAR(20),
    "refills_left" INTEGER,
    "pharmacy" VARCHAR(255),
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_interactions" (
    "id" UUID NOT NULL,
    "medication_a_id" UUID NOT NULL,
    "medication_b_id" UUID NOT NULL,
    "severity" "Severity" NOT NULL,
    "description" TEXT NOT NULL,
    "recommendation" TEXT,
    "source" VARCHAR(100),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medication_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "document_id" UUID,
    "prescribed_by_id" UUID,
    "doctor_name" VARCHAR(255) NOT NULL,
    "doctor_license" VARCHAR(50),
    "clinic_name" VARCHAR(255),
    "diagnosis" VARCHAR(500),
    "icd_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "prescription_date" DATE NOT NULL,
    "valid_until" DATE,
    "follow_up_date" DATE,
    "notes" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMPTZ,
    "fhir_med_req_id" VARCHAR(64),
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vital_signs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "VitalType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "value_secondary" DOUBLE PRECISION,
    "unit" VARCHAR(20) NOT NULL,
    "status" "HealthStatus" NOT NULL DEFAULT 'NORMAL',
    "source" VARCHAR(30),
    "device_name" VARCHAR(100),
    "notes" TEXT,
    "measured_at" TIMESTAMPTZ NOT NULL,
    "loinc_code" VARCHAR(20),
    "fhir_obs_id" VARCHAR(64),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vital_signs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "symptom_entries" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "symptom_name" VARCHAR(100) NOT NULL,
    "body_area" VARCHAR(50),
    "severity" "Severity" NOT NULL DEFAULT 'MILD',
    "duration" VARCHAR(50),
    "frequency" VARCHAR(50),
    "triggers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "accompanied_by" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "started_at" TIMESTAMPTZ NOT NULL,
    "resolved_at" TIMESTAMPTZ,
    "snomed_code" VARCHAR(20),
    "fhir_cond_id" VARCHAR(64),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "symptom_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chronic_conditions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "condition_name" VARCHAR(255) NOT NULL,
    "icd_code" VARCHAR(10),
    "snomed_code" VARCHAR(20),
    "status" "ConditionStatus" NOT NULL DEFAULT 'ACTIVE',
    "severity" "Severity" NOT NULL DEFAULT 'MODERATE',
    "diagnosed_date" DATE,
    "diagnosed_by" VARCHAR(255),
    "resolved_date" DATE,
    "notes" TEXT,
    "management_plan" JSONB,
    "fhir_condition_id" VARCHAR(64),
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "chronic_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_records" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "document_id" UUID,
    "record_type" VARCHAR(30) NOT NULL,
    "parameter_name" VARCHAR(100) NOT NULL,
    "value" VARCHAR(50),
    "unit" VARCHAR(30),
    "reference_min" DOUBLE PRECISION,
    "reference_max" DOUBLE PRECISION,
    "status" "HealthStatus",
    "recorded_date" DATE NOT NULL,
    "loinc_code" VARCHAR(20),
    "snomed_code" VARCHAR(20),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "event_type" "TimelineEventType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "severity" "Severity",
    "document_id" UUID,
    "ref_resource_type" VARCHAR(30),
    "ref_resource_id" UUID,
    "occurred_at" TIMESTAMPTZ NOT NULL,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_notes" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "note_type" VARCHAR(30) NOT NULL,
    "title" VARCHAR(255),
    "subjective" TEXT,
    "objective" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "icd_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cpt_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "follow_up_date" DATE,
    "is_confidential" BOOLEAN NOT NULL DEFAULT false,
    "encryption_key_id" VARCHAR(64),
    "fhir_encounter_id" VARCHAR(64),
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "doctor_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicine_reminders" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_by" UUID,
    "medicine_name" VARCHAR(255) NOT NULL,
    "dosage" VARCHAR(100),
    "frequency" "ReminderFrequency" NOT NULL,
    "times_of_day" TEXT[],
    "days_of_week" INTEGER[],
    "meal_relation" "MealRelation" NOT NULL DEFAULT 'ANY',
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "instructions" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "snooze_minutes" INTEGER NOT NULL DEFAULT 15,
    "escalate_after" INTEGER NOT NULL DEFAULT 30,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "medicine_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "water_reminders" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "daily_goal_ml" INTEGER NOT NULL DEFAULT 2500,
    "interval_minutes" INTEGER NOT NULL DEFAULT 90,
    "active_start" VARCHAR(5) NOT NULL DEFAULT '07:00',
    "active_end" VARCHAR(5) NOT NULL DEFAULT '21:00',
    "glass_size_ml" INTEGER NOT NULL DEFAULT 250,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "water_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_reminders" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "meal_type" "MealType" NOT NULL,
    "scheduled_time" VARCHAR(5) NOT NULL,
    "dietary_notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminder_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "reminder_type" "ReminderType" NOT NULL,
    "reminder_id" UUID NOT NULL,
    "scheduled_at" TIMESTAMPTZ NOT NULL,
    "delivered_at" TIMESTAMPTZ,
    "responded_at" TIMESTAMPTZ,
    "response" "ReminderResponse",
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "escalated_to" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminder_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_groups" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "family_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_group_members" (
    "id" UUID NOT NULL,
    "family_group_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "FamilyRole" NOT NULL,
    "relationship" VARCHAR(30),
    "can_view" BOOLEAN NOT NULL DEFAULT true,
    "can_edit" BOOLEAN NOT NULL DEFAULT false,
    "can_manage_reminders" BOOLEAN NOT NULL DEFAULT false,
    "can_view_reports" BOOLEAN NOT NULL DEFAULT false,
    "can_chat" BOOLEAN NOT NULL DEFAULT true,
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMPTZ,

    CONSTRAINT "family_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_shares" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "share_token" VARCHAR(64) NOT NULL,
    "doctor_name" VARCHAR(255),
    "doctor_email" VARCHAR(255),
    "doctor_phone" VARCHAR(15),
    "access_level" VARCHAR(20) NOT NULL DEFAULT 'read_only',
    "shared_resources" TEXT[] DEFAULT ARRAY['lab_reports', 'prescriptions']::TEXT[],
    "expires_at" TIMESTAMPTZ NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "accessed_count" INTEGER NOT NULL DEFAULT 0,
    "last_accessed" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctor_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(255),
    "context_type" VARCHAR(30),
    "context_ref_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "total_tokens" INTEGER NOT NULL DEFAULT 0,
    "total_cost_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "tokens_used" INTEGER,
    "latency_ms" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT,
    "data" JSONB,
    "action_url" TEXT,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "sent_at" TIMESTAMPTZ,
    "read_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "action" VARCHAR(50) NOT NULL,
    "resource" VARCHAR(50) NOT NULL,
    "resource_id" UUID,
    "old_data" JSONB,
    "new_data" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "severity" VARCHAR(10) NOT NULL DEFAULT 'INFO',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_uploads" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "stored_path" TEXT NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "encryption_key_id" VARCHAR(64),
    "scan_status" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "scan_result" VARCHAR(30),
    "is_quarantined" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_export_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "format" VARCHAR(10) NOT NULL DEFAULT 'json',
    "status" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "download_url" TEXT,
    "expires_at" TIMESTAMPTZ,
    "requested_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "data_export_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_chunks" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_devices" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "push_token" TEXT NOT NULL,
    "device_type" VARCHAR(20) NOT NULL,
    "device_name" VARCHAR(100),
    "os_version" VARCHAR(20),
    "app_version" VARCHAR(20),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_consents" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "purpose" VARCHAR(100) NOT NULL,
    "is_granted" BOOLEAN NOT NULL DEFAULT false,
    "granted_at" TIMESTAMPTZ,
    "withdrawn_at" TIMESTAMPTZ,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_mfa" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "MfaType" NOT NULL DEFAULT 'NONE',
    "secret" VARCHAR(255),
    "backup_codes" TEXT[],
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_mfa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_members" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "relationship" "RelationshipType" NOT NULL DEFAULT 'OTHER',
    "date_of_birth" DATE,
    "gender" "Gender",
    "avatar_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "family_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_permissions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "family_member_id" UUID NOT NULL,
    "access_level" "AccessLevel" NOT NULL DEFAULT 'VIEW',
    "granted_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE INDEX "oauth_accounts_user_id_idx" ON "oauth_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_accounts_provider_provider_id_key" ON "oauth_accounts"("provider", "provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_family_idx" ON "refresh_tokens"("family");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_is_active_idx" ON "user_sessions"("user_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_token_key" ON "password_resets"("token");

-- CreateIndex
CREATE INDEX "password_resets_token_idx" ON "password_resets"("token");

-- CreateIndex
CREATE INDEX "password_resets_user_id_idx" ON "password_resets"("user_id");

-- CreateIndex
CREATE INDEX "documents_user_id_document_date_idx" ON "documents"("user_id", "document_date" DESC);

-- CreateIndex
CREATE INDEX "documents_user_id_document_type_idx" ON "documents"("user_id", "document_type");

-- CreateIndex
CREATE INDEX "documents_deleted_at_idx" ON "documents"("deleted_at");

-- CreateIndex
CREATE INDEX "documents_fhir_doc_ref_id_idx" ON "documents"("fhir_doc_ref_id");

-- CreateIndex
CREATE UNIQUE INDEX "ocr_results_document_id_key" ON "ocr_results"("document_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_summaries_document_id_key" ON "ai_summaries"("document_id");

-- CreateIndex
CREATE INDEX "lab_reports_user_id_report_date_idx" ON "lab_reports"("user_id", "report_date" DESC);

-- CreateIndex
CREATE INDEX "lab_reports_fhir_diag_report_id_idx" ON "lab_reports"("fhir_diag_report_id");

-- CreateIndex
CREATE INDEX "lab_parameters_lab_report_id_idx" ON "lab_parameters"("lab_report_id");

-- CreateIndex
CREATE INDEX "lab_parameters_loinc_code_idx" ON "lab_parameters"("loinc_code");

-- CreateIndex
CREATE INDEX "imaging_reports_user_id_study_date_idx" ON "imaging_reports"("user_id", "study_date" DESC);

-- CreateIndex
CREATE INDEX "imaging_reports_dicom_study_uid_idx" ON "imaging_reports"("dicom_study_uid");

-- CreateIndex
CREATE INDEX "medications_user_id_status_idx" ON "medications"("user_id", "status");

-- CreateIndex
CREATE INDEX "medications_rxcui_idx" ON "medications"("rxcui");

-- CreateIndex
CREATE INDEX "medications_deleted_at_idx" ON "medications"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "medication_interactions_medication_a_id_medication_b_id_key" ON "medication_interactions"("medication_a_id", "medication_b_id");

-- CreateIndex
CREATE INDEX "prescriptions_user_id_prescription_date_idx" ON "prescriptions"("user_id", "prescription_date" DESC);

-- CreateIndex
CREATE INDEX "prescriptions_fhir_med_req_id_idx" ON "prescriptions"("fhir_med_req_id");

-- CreateIndex
CREATE INDEX "vital_signs_user_id_type_measured_at_idx" ON "vital_signs"("user_id", "type", "measured_at" DESC);

-- CreateIndex
CREATE INDEX "vital_signs_user_id_measured_at_idx" ON "vital_signs"("user_id", "measured_at" DESC);

-- CreateIndex
CREATE INDEX "vital_signs_fhir_obs_id_idx" ON "vital_signs"("fhir_obs_id");

-- CreateIndex
CREATE INDEX "symptom_entries_user_id_started_at_idx" ON "symptom_entries"("user_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "symptom_entries_user_id_symptom_name_idx" ON "symptom_entries"("user_id", "symptom_name");

-- CreateIndex
CREATE INDEX "symptom_entries_snomed_code_idx" ON "symptom_entries"("snomed_code");

-- CreateIndex
CREATE INDEX "chronic_conditions_user_id_status_idx" ON "chronic_conditions"("user_id", "status");

-- CreateIndex
CREATE INDEX "chronic_conditions_icd_code_idx" ON "chronic_conditions"("icd_code");

-- CreateIndex
CREATE INDEX "chronic_conditions_snomed_code_idx" ON "chronic_conditions"("snomed_code");

-- CreateIndex
CREATE INDEX "health_records_user_id_parameter_name_recorded_date_idx" ON "health_records"("user_id", "parameter_name", "recorded_date" DESC);

-- CreateIndex
CREATE INDEX "health_records_loinc_code_idx" ON "health_records"("loinc_code");

-- CreateIndex
CREATE INDEX "timeline_events_user_id_occurred_at_idx" ON "timeline_events"("user_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "timeline_events_user_id_event_type_idx" ON "timeline_events"("user_id", "event_type");

-- CreateIndex
CREATE INDEX "timeline_events_ref_resource_type_ref_resource_id_idx" ON "timeline_events"("ref_resource_type", "ref_resource_id");

-- CreateIndex
CREATE INDEX "doctor_notes_patient_id_created_at_idx" ON "doctor_notes"("patient_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "doctor_notes_author_id_idx" ON "doctor_notes"("author_id");

-- CreateIndex
CREATE INDEX "doctor_notes_fhir_encounter_id_idx" ON "doctor_notes"("fhir_encounter_id");

-- CreateIndex
CREATE INDEX "medicine_reminders_user_id_is_active_idx" ON "medicine_reminders"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "medicine_reminders_deleted_at_idx" ON "medicine_reminders"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "water_reminders_user_id_key" ON "water_reminders"("user_id");

-- CreateIndex
CREATE INDEX "meal_reminders_user_id_is_active_idx" ON "meal_reminders"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "reminder_logs_user_id_scheduled_at_idx" ON "reminder_logs"("user_id", "scheduled_at" DESC);

-- CreateIndex
CREATE INDEX "reminder_logs_user_id_reminder_type_scheduled_at_idx" ON "reminder_logs"("user_id", "reminder_type", "scheduled_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "family_group_members_family_group_id_user_id_key" ON "family_group_members"("family_group_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_shares_share_token_key" ON "doctor_shares"("share_token");

-- CreateIndex
CREATE INDEX "doctor_shares_share_token_idx" ON "doctor_shares"("share_token");

-- CreateIndex
CREATE INDEX "doctor_shares_user_id_idx" ON "doctor_shares"("user_id");

-- CreateIndex
CREATE INDEX "chat_sessions_user_id_created_at_idx" ON "chat_sessions"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "chat_messages_session_id_created_at_idx" ON "chat_messages"("session_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_user_id_status_idx" ON "notifications"("user_id", "status");

-- CreateIndex
CREATE INDEX "notifications_expires_at_idx" ON "notifications"("expires_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_resource_resource_id_idx" ON "audit_logs"("resource", "resource_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "file_uploads_user_id_created_at_idx" ON "file_uploads"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "file_uploads_checksum_idx" ON "file_uploads"("checksum");

-- CreateIndex
CREATE INDEX "data_export_requests_user_id_idx" ON "data_export_requests"("user_id");

-- CreateIndex
CREATE INDEX "document_chunks_document_id_idx" ON "document_chunks"("document_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_devices_push_token_key" ON "user_devices"("push_token");

-- CreateIndex
CREATE INDEX "user_devices_user_id_idx" ON "user_devices"("user_id");

-- CreateIndex
CREATE INDEX "data_consents_user_id_purpose_idx" ON "data_consents"("user_id", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "user_mfa_user_id_key" ON "user_mfa"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "access_permissions_user_id_family_member_id_key" ON "access_permissions"("user_id", "family_member_id");

-- AddForeignKey
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocr_results" ADD CONSTRAINT "ocr_results_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_summaries" ADD CONSTRAINT "ai_summaries_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_reports" ADD CONSTRAINT "lab_reports_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_parameters" ADD CONSTRAINT "lab_parameters_lab_report_id_fkey" FOREIGN KEY ("lab_report_id") REFERENCES "lab_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imaging_reports" ADD CONSTRAINT "imaging_reports_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_interactions" ADD CONSTRAINT "medication_interactions_medication_a_id_fkey" FOREIGN KEY ("medication_a_id") REFERENCES "medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_interactions" ADD CONSTRAINT "medication_interactions_medication_b_id_fkey" FOREIGN KEY ("medication_b_id") REFERENCES "medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_prescribed_by_id_fkey" FOREIGN KEY ("prescribed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "symptom_entries" ADD CONSTRAINT "symptom_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chronic_conditions" ADD CONSTRAINT "chronic_conditions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_notes" ADD CONSTRAINT "doctor_notes_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_notes" ADD CONSTRAINT "doctor_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine_reminders" ADD CONSTRAINT "medicine_reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine_reminders" ADD CONSTRAINT "medicine_reminders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_reminders" ADD CONSTRAINT "water_reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_reminders" ADD CONSTRAINT "meal_reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder_logs" ADD CONSTRAINT "reminder_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder_logs" ADD CONSTRAINT "reminder_logs_escalated_to_fkey" FOREIGN KEY ("escalated_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_groups" ADD CONSTRAINT "family_groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_group_members" ADD CONSTRAINT "family_group_members_family_group_id_fkey" FOREIGN KEY ("family_group_id") REFERENCES "family_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_group_members" ADD CONSTRAINT "family_group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_shares" ADD CONSTRAINT "doctor_shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_consents" ADD CONSTRAINT "data_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_mfa" ADD CONSTRAINT "user_mfa_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_permissions" ADD CONSTRAINT "access_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_permissions" ADD CONSTRAINT "access_permissions_family_member_id_fkey" FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_permissions" ADD CONSTRAINT "access_permissions_granted_by_id_fkey" FOREIGN KEY ("granted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
