/*
  Warnings:

  - Made the column `ClaimTitle` on table `claims` required. This step will fail if there are existing NULL values in that column.
  - Made the column `Email` on table `claims` required. This step will fail if there are existing NULL values in that column.
  - Made the column `PhoneNumber` on table `claims` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."claims" ALTER COLUMN "ClaimTitle" SET NOT NULL,
ALTER COLUMN "Email" SET NOT NULL,
ALTER COLUMN "PhoneNumber" SET NOT NULL;
