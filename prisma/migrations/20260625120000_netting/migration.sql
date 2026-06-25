-- CreateEnum
CREATE TYPE "NettingEntryType" AS ENUM ('INITIATOR_OWES', 'COUNTERPARTY_OWES');

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'NETTED';

-- AlterTable
ALTER TABLE "ExpenseParticipant" ADD COLUMN "nettedAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ExpenseParticipant" ADD COLUMN "nettingSettlementId" TEXT;

-- CreateTable
CREATE TABLE "NettingSettlement" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "initiatorPersonId" TEXT NOT NULL,
    "counterpartyPersonId" TEXT NOT NULL,
    "nettedAmount" INTEGER NOT NULL,
    "initiatorDebtBefore" INTEGER NOT NULL,
    "initiatorReceivableBefore" INTEGER NOT NULL,
    "initiatorDebtAfter" INTEGER NOT NULL,
    "initiatorReceivableAfter" INTEGER NOT NULL,
    "counterpartyDebtBefore" INTEGER NOT NULL,
    "counterpartyReceivableBefore" INTEGER NOT NULL,
    "counterpartyDebtAfter" INTEGER NOT NULL,
    "counterpartyReceivableAfter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NettingSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NettingSettlementItem" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "entryType" "NettingEntryType" NOT NULL,

    CONSTRAINT "NettingSettlementItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NettingSettlement_groupId_createdAt_idx" ON "NettingSettlement"("groupId", "createdAt");
CREATE INDEX "NettingSettlement_initiatorPersonId_idx" ON "NettingSettlement"("initiatorPersonId");
CREATE INDEX "NettingSettlement_counterpartyPersonId_idx" ON "NettingSettlement"("counterpartyPersonId");
CREATE INDEX "NettingSettlementItem_settlementId_idx" ON "NettingSettlementItem"("settlementId");
CREATE INDEX "NettingSettlementItem_participantId_idx" ON "NettingSettlementItem"("participantId");

-- AddForeignKey
ALTER TABLE "ExpenseParticipant" ADD CONSTRAINT "ExpenseParticipant_nettingSettlementId_fkey" FOREIGN KEY ("nettingSettlementId") REFERENCES "NettingSettlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NettingSettlement" ADD CONSTRAINT "NettingSettlement_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NettingSettlement" ADD CONSTRAINT "NettingSettlement_initiatorPersonId_fkey" FOREIGN KEY ("initiatorPersonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NettingSettlement" ADD CONSTRAINT "NettingSettlement_counterpartyPersonId_fkey" FOREIGN KEY ("counterpartyPersonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NettingSettlementItem" ADD CONSTRAINT "NettingSettlementItem_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "NettingSettlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NettingSettlementItem" ADD CONSTRAINT "NettingSettlementItem_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "ExpenseParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
