-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "OTP_life_time" TIMESTAMP(3),
ADD COLUMN     "OTP_number" TEXT;
