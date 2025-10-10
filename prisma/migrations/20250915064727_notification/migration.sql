-- CreateEnum
CREATE TYPE "public"."NotificationStatus" AS ENUM ('UNREAD', 'READ', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('CLAIM_SUBMITTED', 'CLAIM_STATUS_CHANGED', 'CLAIM_ASSIGNMENT', 'DOCUMENT_UPLOADED', 'MESSAGE_RECEIVED', 'SYSTEM');

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "status" "public"."NotificationStatus" NOT NULL DEFAULT 'UNREAD',
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_status_createdAt_idx" ON "public"."Notification"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_entityType_entityId_idx" ON "public"."Notification"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "claims_status_idx" ON "public"."claims"("status");

-- CreateIndex
CREATE INDEX "claims_submissionDate_idx" ON "public"."claims"("submissionDate");

-- CreateIndex
CREATE INDEX "claims_status_companyId_idx" ON "public"."claims"("status", "companyId");

-- CreateIndex
CREATE INDEX "claims_status_evaluatorId_idx" ON "public"."claims"("status", "evaluatorId");

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
