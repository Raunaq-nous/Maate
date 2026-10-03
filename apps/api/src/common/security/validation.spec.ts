import { VitalType, HealthStatus, Severity, Gender } from "@maate/database";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import { SendMessageDto } from "../../modules/chat/dto/chat.dto";
import { CreateVitalSignDto, CreateDoctorNoteDto, CreateSymptomDto } from "../../modules/health/dto/health.dto";
import { CreateDoctorShareDto } from "../../modules/share/dto/share.dto";
import { UpdateUserDto } from "../../modules/user/dto/update-user.dto";

describe("DTO Input Validation & Constraint Hardening (HIPAA / DPDP)", () => {
  describe("CreateVitalSignDto", () => {
    it("should accept valid vital sign payload", async () => {
      const dto = plainToInstance(CreateVitalSignDto, {
        type: VitalType.BLOOD_PRESSURE,
        value: 120,
        valueSecondary: 80,
        unit: "mmHg",
        status: HealthStatus.NORMAL,
        measuredAt: "2026-03-15T08:30:00.000Z",
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should reject negative or out-of-bounds values", async () => {
      const dto = plainToInstance(CreateVitalSignDto, {
        type: VitalType.BLOOD_PRESSURE,
        value: -10,
        unit: "mmHg",
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === "value")).toBe(true);
    });

    it("should reject invalid enum vital type", async () => {
      const dto = plainToInstance(CreateVitalSignDto, {
        type: "INVALID_VITAL" as any,
        value: 120,
        unit: "mmHg",
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === "type")).toBe(true);
    });
  });

  describe("CreateDoctorNoteDto", () => {
    it("should accept valid doctor note", async () => {
      const dto = plainToInstance(CreateDoctorNoteDto, {
        patientId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        noteType: "SOAP",
        title: "Routine Consultation",
        followUpDate: "2026-04-01T10:00:00.000Z",
        icdCodes: ["I10", "E11.9"],
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should reject non-UUID patientId", async () => {
      const dto = plainToInstance(CreateDoctorNoteDto, {
        patientId: "not-a-valid-uuid",
        noteType: "SOAP",
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === "patientId")).toBe(true);
    });

    it("should reject non-date followUpDate", async () => {
      const dto = plainToInstance(CreateDoctorNoteDto, {
        noteType: "SOAP",
        followUpDate: "next-tuesday",
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === "followUpDate")).toBe(true);
    });
  });

  describe("CreateSymptomDto", () => {
    it("should accept valid symptom", async () => {
      const dto = plainToInstance(CreateSymptomDto, {
        symptomName: "Migraine",
        bodyArea: "Head",
        severity: Severity.MODERATE,
        triggers: ["Bright Light", "Stress"],
        accompaniedBy: ["Nausea"],
        startedAt: "2026-03-10T09:00:00.000Z",
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should reject non-array triggers or non-string array triggers", async () => {
      const dto = plainToInstance(CreateSymptomDto, {
        symptomName: "Migraine",
        triggers: [123, 456] as any,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === "triggers")).toBe(true);
    });
  });

  describe("UpdateUserDto", () => {
    it("should accept valid user update payload", async () => {
      const dto = plainToInstance(UpdateUserDto, {
        fullName: "Priya Sharma",
        dateOfBirth: "1990-05-15",
        gender: Gender.FEMALE,
        bloodGroup: "O+",
        heightCm: 165,
        weightKg: 62.5,
        allergiesJson: ["Peanuts", "Dust"],
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should reject invalid dateOfBirth and gender", async () => {
      const dto = plainToInstance(UpdateUserDto, {
        dateOfBirth: "not-a-date",
        gender: "UNKNOWN_GENDER" as any,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === "dateOfBirth")).toBe(true);
      expect(errors.some((e) => e.property === "gender")).toBe(true);
    });
  });

  describe("SendMessageDto & CreateDoctorShareDto", () => {
    it("should reject non-UUID sessionId in SendMessageDto", async () => {
      const dto = plainToInstance(SendMessageDto, {
        message: "Hello",
        sessionId: "invalid-uuid",
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === "sessionId")).toBe(true);
    });

    it("should reject out-of-range expiresInDays in CreateDoctorShareDto", async () => {
      const dto = plainToInstance(CreateDoctorShareDto, {
        doctorName: "Dr. Arvind Rao",
        expiresInDays: 365, // Max is 90
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === "expiresInDays")).toBe(true);
    });
  });
});
