import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { VitalType, HealthStatus, Severity, ConditionStatus } from '@maate/database';

// ─── Vital Signs DTOs ──────────────────────
export class CreateVitalSignDto {
  @ApiProperty({ enum: VitalType, description: 'Type of vital sign' })
  @IsEnum(VitalType)
  @IsNotEmpty()
  type!: VitalType;

  @ApiProperty({ description: 'Primary value (e.g. 120 for Systolic BP, 72 for HR)' })
  @IsNumber()
  @IsNotEmpty()
  value!: number;

  @ApiPropertyOptional({ description: 'Secondary value (e.g. 80 for Diastolic BP)' })
  @IsNumber()
  @IsOptional()
  valueSecondary?: number;

  @ApiProperty({ description: 'Unit of measurement (e.g. mmHg, bpm, mg/dL, kg)' })
  @IsString()
  @IsNotEmpty()
  unit!: string;

  @ApiPropertyOptional({ enum: HealthStatus, default: HealthStatus.NORMAL })
  @IsEnum(HealthStatus)
  @IsOptional()
  status?: HealthStatus;

  @ApiPropertyOptional({ description: 'Source (e.g. MANUAL, APPLE_HEALTH, OMRON)' })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({ description: 'Device name' })
  @IsString()
  @IsOptional()
  deviceName?: string;

  @ApiPropertyOptional({ description: 'Contextual notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Timestamp when measured' })
  @IsDateString()
  @IsOptional()
  measuredAt?: string;
}

export class QueryVitalsDto {
  @ApiPropertyOptional({ enum: VitalType })
  @IsEnum(VitalType)
  @IsOptional()
  type?: VitalType;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;
}

// ─── Symptom Entry DTOs ────────────────────
export class CreateSymptomDto {
  @ApiProperty({ description: 'Name of the symptom (e.g. Migraine, Chest Pain)' })
  @IsString()
  @IsNotEmpty()
  symptomName!: string;

  @ApiPropertyOptional({ description: 'Body area (e.g. Head, Abdomen)' })
  @IsString()
  @IsOptional()
  bodyArea?: string;

  @ApiPropertyOptional({ enum: Severity, default: Severity.MILD })
  @IsEnum(Severity)
  @IsOptional()
  severity?: Severity;

  @ApiPropertyOptional({ description: 'Duration (e.g. 2 hours, 3 days)' })
  @IsString()
  @IsOptional()
  duration?: string;

  @ApiPropertyOptional({ description: 'Frequency (e.g. Constant, Intermittent)' })
  @IsString()
  @IsOptional()
  frequency?: string;

  @ApiPropertyOptional({ type: [String], description: 'Triggers' })
  @IsArray()
  @IsOptional()
  triggers?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Accompanied symptoms' })
  @IsArray()
  @IsOptional()
  accompaniedBy?: string[];

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Timestamp when symptom started' })
  @IsDateString()
  @IsOptional()
  startedAt?: string;
}

export class QuerySymptomsDto {
  @ApiPropertyOptional({ enum: Severity })
  @IsEnum(Severity)
  @IsOptional()
  severity?: Severity;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;
}

// ─── Chronic Condition DTOs ────────────────
export class CreateConditionDto {
  @ApiProperty({ description: 'Name of condition (e.g. Type 2 Diabetes, Hypertension)' })
  @IsString()
  @IsNotEmpty()
  conditionName!: string;

  @ApiPropertyOptional({ description: 'ICD-10 code (e.g. E11.9, I10)' })
  @IsString()
  @IsOptional()
  icdCode?: string;

  @ApiPropertyOptional({ description: 'SNOMED CT code' })
  @IsString()
  @IsOptional()
  snomedCode?: string;

  @ApiPropertyOptional({ enum: ConditionStatus, default: ConditionStatus.ACTIVE })
  @IsEnum(ConditionStatus)
  @IsOptional()
  status?: ConditionStatus;

  @ApiPropertyOptional({ enum: Severity, default: Severity.MODERATE })
  @IsEnum(Severity)
  @IsOptional()
  severity?: Severity;

  @ApiPropertyOptional({ description: 'Date diagnosed' })
  @IsDateString()
  @IsOptional()
  diagnosedDate?: string;

  @ApiPropertyOptional({ description: 'Diagnosing clinician/facility' })
  @IsString()
  @IsOptional()
  diagnosedBy?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Management plan JSON' })
  @IsOptional()
  managementPlan?: any;
}

export class UpdateConditionDto {
  @ApiPropertyOptional({ enum: ConditionStatus })
  @IsEnum(ConditionStatus)
  @IsOptional()
  status?: ConditionStatus;

  @ApiPropertyOptional({ enum: Severity })
  @IsEnum(Severity)
  @IsOptional()
  severity?: Severity;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  resolvedDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  managementPlan?: any;
}

// ─── Doctor Note DTOs ──────────────────────
export class CreateDoctorNoteDto {
  @ApiPropertyOptional({ description: 'Patient user ID (defaults to current user)' })
  @IsString()
  @IsOptional()
  patientId?: string;

  @ApiProperty({ description: 'Note type (e.g. SOAP, CONSULTATION, PROGRESS)' })
  @IsString()
  @IsNotEmpty()
  noteType!: string;

  @ApiPropertyOptional({ description: 'Title or chief complaint' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Subjective observations' })
  @IsString()
  @IsOptional()
  subjective?: string;

  @ApiPropertyOptional({ description: 'Objective measurements & findings' })
  @IsString()
  @IsOptional()
  objective?: string;

  @ApiPropertyOptional({ description: 'Clinical assessment' })
  @IsString()
  @IsOptional()
  assessment?: string;

  @ApiPropertyOptional({ description: 'Treatment & follow-up plan' })
  @IsString()
  @IsOptional()
  plan?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  icdCodes?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  cptCodes?: string[];

  @ApiPropertyOptional({ description: 'Follow-up date' })
  @IsDateString()
  @IsOptional()
  followUpDate?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isConfidential?: boolean;
}

// ─── Analytics & Trends DTOs ───────────────
export class QueryTrendsDto {
  @ApiPropertyOptional({ enum: VitalType, description: 'Vital sign type' })
  @IsEnum(VitalType)
  @IsOptional()
  vitalType?: VitalType;

  @ApiPropertyOptional({ description: 'Lab parameter name (e.g. Hemoglobin, HbA1c)' })
  @IsString()
  @IsOptional()
  parameterName?: string;

  @ApiPropertyOptional({ enum: ['7D', '1M', '3M', '6M', '1Y'], default: '3M' })
  @IsOptional()
  period?: '7D' | '1M' | '3M' | '6M' | '1Y';
}
