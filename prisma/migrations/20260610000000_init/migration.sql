CREATE TYPE "PersonType" AS ENUM ('MEMBER', 'GUEST');
CREATE TYPE "ExpenseStatus" AS ENUM ('ACTIVE', 'CANCELLED');
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'UNPAID');

CREATE TABLE "Person" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "username" TEXT,
  "type" "PersonType" NOT NULL DEFAULT 'MEMBER',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Expense" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "paidByPersonId" TEXT NOT NULL,
  "createdByPersonId" TEXT NOT NULL,
  "cardNumber" TEXT,
  "paymentNote" TEXT,
  "date" TIMESTAMP(3) NOT NULL,
  "description" TEXT,
  "status" "ExpenseStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExpenseParticipant" (
  "id" TEXT NOT NULL,
  "expenseId" TEXT NOT NULL,
  "personId" TEXT NOT NULL,
  "shareAmount" INTEGER NOT NULL,
  "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
  "paidAt" TIMESTAMP(3),
  "markedByPersonId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExpenseParticipant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Person_username_key" ON "Person"("username");
CREATE UNIQUE INDEX "ExpenseParticipant_expenseId_personId_key" ON "ExpenseParticipant"("expenseId", "personId");

ALTER TABLE "Expense" ADD CONSTRAINT "Expense_paidByPersonId_fkey" FOREIGN KEY ("paidByPersonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExpenseParticipant" ADD CONSTRAINT "ExpenseParticipant_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExpenseParticipant" ADD CONSTRAINT "ExpenseParticipant_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExpenseParticipant" ADD CONSTRAINT "ExpenseParticipant_markedByPersonId_fkey" FOREIGN KEY ("markedByPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
