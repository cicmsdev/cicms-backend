/*
  Warnings:

  - You are about to drop the column `contactEmail` on the `InsuranceCompany` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email]` on the table `InsuranceCompany` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `InsuranceCompany` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."InsuranceCompany_contactEmail_key";

-- AlterTable
ALTER TABLE "public"."InsuranceCompany" DROP COLUMN "contactEmail",
ADD COLUMN     "email" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceCompany_email_key" ON "public"."InsuranceCompany"("email");
