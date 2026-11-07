-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN     "deviceName" TEXT,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "userAgent" TEXT;
