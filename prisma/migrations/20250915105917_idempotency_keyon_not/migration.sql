/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey]` on the table `Notification` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Notification" ADD COLUMN     "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Notification_idempotencyKey_key" ON "public"."Notification"("idempotencyKey");
