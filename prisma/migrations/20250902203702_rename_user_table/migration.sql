/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."User" DROP CONSTRAINT "User_insuranceCompanyId_fkey";

-- DropForeignKey
ALTER TABLE "public"."User" DROP CONSTRAINT "User_roleId_fkey";

-- DropTable
DROP TABLE "public"."User";

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "status" "public"."UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "roleId" TEXT NOT NULL,
    "insuranceCompanyId" TEXT,
    "isDefaultPassword" BOOLEAN NOT NULL DEFAULT true,
    "OTP_number" TEXT,
    "OTP_life_time" TIMESTAMP(3),
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phoneNumber_key" ON "public"."users"("phoneNumber");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_insuranceCompanyId_fkey" FOREIGN KEY ("insuranceCompanyId") REFERENCES "public"."InsuranceCompany"("companyId") ON DELETE SET NULL ON UPDATE CASCADE;
