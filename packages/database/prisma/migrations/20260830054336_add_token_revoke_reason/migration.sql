-- CreateEnum
CREATE TYPE "RevokeReason" AS ENUM ('ROTATED', 'LOGOUT', 'THEFT_DETECTED');

-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN     "revoked_at" TIMESTAMPTZ,
ADD COLUMN     "revoked_reason" "RevokeReason";
