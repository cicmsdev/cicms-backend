/*
  Warnings:

  - You are about to drop the `Notification` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropTable
DROP TABLE "public"."Notification";

-- DropEnum
DROP TYPE "public"."NotificationStatus";

-- DropEnum
DROP TYPE "public"."NotificationType";
