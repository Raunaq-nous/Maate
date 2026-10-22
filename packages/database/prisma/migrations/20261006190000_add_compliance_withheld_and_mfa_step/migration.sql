-- AlterEnum
ALTER TYPE "ProcessingStatus" ADD VALUE IF NOT EXISTS 'WITHHELD';

-- AlterTable
ALTER TABLE "user_mfa" ADD COLUMN IF NOT EXISTS "last_used_step" INTEGER;
