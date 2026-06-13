-- CreateEnum
CREATE TYPE "ExpenseSplitMode" AS ENUM ('EQUAL', 'CUSTOM');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "splitMode" "ExpenseSplitMode" NOT NULL DEFAULT 'EQUAL';

ALTER TABLE "ExpenseParticipant" ALTER COLUMN "shareAmount" DROP NOT NULL;
ALTER TABLE "ExpenseParticipant" ADD COLUMN "shareEnteredAt" TIMESTAMP(3);
