/*
  Warnings:

  - The values [IN_REVIEW,ASSIGNED] on the enum `ClaimStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."ClaimStatus_new" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'IN_EVALUATION', 'RESOLVED', 'RESOLVED_IN_COURT');
ALTER TABLE "public"."claims" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."claims" ALTER COLUMN "status" TYPE "public"."ClaimStatus_new" USING ("status"::text::"public"."ClaimStatus_new");
ALTER TYPE "public"."ClaimStatus" RENAME TO "ClaimStatus_old";
ALTER TYPE "public"."ClaimStatus_new" RENAME TO "ClaimStatus";
DROP TYPE "public"."ClaimStatus_old";
ALTER TABLE "public"."claims" ALTER COLUMN "status" SET DEFAULT 'SUBMITTED';
COMMIT;
