-- CreateEnum
CREATE TYPE "ChoreType" AS ENUM ('COOKING', 'DISHES', 'SHOPPING', 'CLEANING', 'OTHER');

-- CreateEnum
CREATE TYPE "ChoreStatus" AS ENUM ('ASSIGNED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ChoreIntensity" AS ENUM ('LIGHT', 'NORMAL', 'HEAVY');

-- CreateTable
CREATE TABLE "Chore" (
  "id" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "type" "ChoreType" NOT NULL,
  "title" TEXT NOT NULL,
  "status" "ChoreStatus" NOT NULL DEFAULT 'COMPLETED',
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "note" TEXT,
  "assignedByPersonId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Chore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChoreParticipant" (
  "id" TEXT NOT NULL,
  "choreId" TEXT NOT NULL,
  "personId" TEXT NOT NULL,
  "intensity" "ChoreIntensity" NOT NULL DEFAULT 'NORMAL',
  "score" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ChoreParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Chore_groupId_status_scheduledFor_idx" ON "Chore"("groupId", "status", "scheduledFor");

-- CreateIndex
CREATE INDEX "Chore_assignedByPersonId_idx" ON "Chore"("assignedByPersonId");

-- CreateIndex
CREATE INDEX "ChoreParticipant_personId_idx" ON "ChoreParticipant"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "ChoreParticipant_choreId_personId_key" ON "ChoreParticipant"("choreId", "personId");

-- AddForeignKey
ALTER TABLE "Chore" ADD CONSTRAINT "Chore_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chore" ADD CONSTRAINT "Chore_assignedByPersonId_fkey" FOREIGN KEY ("assignedByPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreParticipant" ADD CONSTRAINT "ChoreParticipant_choreId_fkey" FOREIGN KEY ("choreId") REFERENCES "Chore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreParticipant" ADD CONSTRAINT "ChoreParticipant_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
