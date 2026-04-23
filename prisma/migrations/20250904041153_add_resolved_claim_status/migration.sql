/*
  Warnings:

  - You are about to drop the column `assignedToId` on the `claims` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "public"."ClaimStatus" ADD VALUE 'RESOLVED';

-- DropForeignKey
ALTER TABLE "public"."claims" DROP CONSTRAINT "claims_assignedToId_fkey";

-- DropIndex
DROP INDEX "public"."claims_assignedToId_idx";

-- AlterTable
ALTER TABLE "public"."claims" DROP COLUMN "assignedToId",
ADD COLUMN     "evaluatorId" TEXT;

-- CreateIndex
CREATE INDEX "claims_evaluatorId_idx" ON "public"."claims"("evaluatorId");

-- AddForeignKey
ALTER TABLE "public"."claims" ADD CONSTRAINT "claims_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
