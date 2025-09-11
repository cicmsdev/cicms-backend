/*
  Warnings:

  - You are about to drop the column `description` on the `claims` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."claims" DROP COLUMN "description",
ADD COLUMN     "ClaimTitle" TEXT;
