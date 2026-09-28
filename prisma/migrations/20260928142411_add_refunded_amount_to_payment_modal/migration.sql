-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'PARTIALLY_REFUNDED';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "refundedAmount" INTEGER NOT NULL DEFAULT 0;
