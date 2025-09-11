/*
  Warnings:

  - The values [REPORT,INVOICE,RECEIPT,CONTRACT,IMAGE,OTHER] on the enum `DocumentType` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `uploaderId` to the `documents` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."ClaimStatus" ADD VALUE 'COMPLETED';
ALTER TYPE "public"."ClaimStatus" ADD VALUE 'RESOLVED_IN_COURT';

-- AlterEnum
BEGIN;
CREATE TYPE "public"."DocumentType_new" AS ENUM ('DAMAGE_REPORT', 'POLICE_REPORT', 'SITE_INSPECTION_REPORT', 'LAND_OWNERSHIP_PROOF');
ALTER TABLE "public"."documents" ALTER COLUMN "documentType" TYPE "public"."DocumentType_new" USING ("documentType"::text::"public"."DocumentType_new");
ALTER TYPE "public"."DocumentType" RENAME TO "DocumentType_old";
ALTER TYPE "public"."DocumentType_new" RENAME TO "DocumentType";
DROP TYPE "public"."DocumentType_old";
COMMIT;

-- AlterTable
ALTER TABLE "public"."documents" ADD COLUMN     "uploaderId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "documents_uploaderId_idx" ON "public"."documents"("uploaderId");

-- AddForeignKey
ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
