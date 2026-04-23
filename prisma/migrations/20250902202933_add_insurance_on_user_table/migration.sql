-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "insuranceCompanyId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_insuranceCompanyId_fkey" FOREIGN KEY ("insuranceCompanyId") REFERENCES "public"."InsuranceCompany"("companyId") ON DELETE SET NULL ON UPDATE CASCADE;
