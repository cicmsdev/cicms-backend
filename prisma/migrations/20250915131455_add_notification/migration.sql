-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('DM_MESSAGE', 'CLAIM_MESSAGE', 'CLAIM_STATUS_CHANGED', 'EVALUATOR_ASSIGNED', 'DOCUMENT_ADDED', 'SYSTEM');

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "data" JSONB,
    "actorId" TEXT,
    "claimId" TEXT,
    "messageId" TEXT,
    "seenAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "public"."Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "public"."Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_claimId_createdAt_idx" ON "public"."Notification"("claimId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_messageId_idx" ON "public"."Notification"("messageId");

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "public"."claims"("claimId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "public"."Message"("messageId") ON DELETE SET NULL ON UPDATE CASCADE;
