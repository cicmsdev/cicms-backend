-- CreateTable
CREATE TABLE "public"."InsuranceCompany" (
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "policyNumberPrefix" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceCompany_pkey" PRIMARY KEY ("companyId")
);

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceCompany_name_key" ON "public"."InsuranceCompany"("name");

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceCompany_contactEmail_key" ON "public"."InsuranceCompany"("contactEmail");
