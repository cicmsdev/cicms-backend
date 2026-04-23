/*
  Warnings:

  - You are about to drop the column `Email` on the `claims` table. All the data in the column will be lost.
  - You are about to drop the column `PhoneNumber` on the `claims` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."claims" DROP COLUMN "Email",
DROP COLUMN "PhoneNumber";
