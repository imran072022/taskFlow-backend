/*
  Warnings:

  - Added the required column `description` to the `Organization` table without a default value. This is not possible if the table is not empty.
  - Added the required column `industry` to the `Organization` table without a default value. This is not possible if the table is not empty.
  - Added the required column `size` to the `Organization` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OrganizationSize" AS ENUM ('SOLO', 'TWO_TO_TEN', 'ELEVEN_TO_FIFTY', 'FIFTY_ONE_TO_TWO_HUNDRED', 'TWO_HUNDRED_PLUS');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "industry" TEXT NOT NULL,
ADD COLUMN     "size" "OrganizationSize" NOT NULL,
ADD COLUMN     "website" TEXT;
