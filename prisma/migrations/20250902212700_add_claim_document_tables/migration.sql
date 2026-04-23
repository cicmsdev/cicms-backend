-- CreateEnum
CREATE TYPE "public"."ClaimStatus" AS ENUM ('SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."DocumentType" AS ENUM ('REPORT', 'INVOICE', 'RECEIPT', 'CONTRACT', 'IMAGE', 'OTHER');

-- CreateTable
CREATE TABLE "public"."claims" (
    "claimId" TEXT NOT NULL,
    "submissionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "public"."ClaimStatus" NOT NULL DEFAULT 'SUBMITTED',
    "description" TEXT,
    "submittedById" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("claimId")
);

-- CreateTable
CREATE TABLE "public"."documents" (
    "documentId" TEXT NOT NULL,
    "documentType" "public"."DocumentType" NOT NULL,
    "filePath" TEXT NOT NULL,
    "uploadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("documentId")
);

-- CreateIndex
CREATE INDEX "claims_submittedById_idx" ON "public"."claims"("submittedById");

-- CreateIndex
CREATE INDEX "claims_companyId_idx" ON "public"."claims"("companyId");

-- CreateIndex
CREATE INDEX "documents_claimId_idx" ON "public"."documents"("claimId");

-- AddForeignKey
ALTER TABLE "public"."claims" ADD CONSTRAINT "claims_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."claims" ADD CONSTRAINT "claims_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."InsuranceCompany"("companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "public"."claims"("claimId") ON DELETE RESTRICT ON UPDATE CASCADE;
