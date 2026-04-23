-- CreateTable
CREATE TABLE "public"."ClaimActivity" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "performedById" TEXT,
    "action" TEXT NOT NULL,
    "fromStatus" "public"."ClaimStatus",
    "toStatus" "public"."ClaimStatus",
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClaimActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClaimActivity_claimId_createdAt_idx" ON "public"."ClaimActivity"("claimId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."ClaimActivity" ADD CONSTRAINT "ClaimActivity_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "public"."claims"("claimId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClaimActivity" ADD CONSTRAINT "ClaimActivity_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
