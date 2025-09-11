-- AlterTable
ALTER TABLE "public"."claims" ADD COLUMN     "assignedToId" TEXT;

-- CreateIndex
CREATE INDEX "claims_assignedToId_idx" ON "public"."claims"("assignedToId");

-- AddForeignKey
ALTER TABLE "public"."claims" ADD CONSTRAINT "claims_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
