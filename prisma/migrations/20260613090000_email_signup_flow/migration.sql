CREATE TYPE "EmailVerificationPurpose" AS ENUM ('USER_SIGNUP', 'GROUP_SIGNUP');
CREATE TYPE "MembershipRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "emailVerifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmailVerificationCode" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "purpose" "EmailVerificationPurpose" NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailVerificationCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MembershipRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "status" "MembershipRequestStatus" NOT NULL DEFAULT 'PENDING',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "reviewedByPersonId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MembershipRequest_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Group" ADD COLUMN "joinCode" TEXT;
UPDATE "Group"
SET "joinCode" = UPPER(SUBSTRING(MD5(RANDOM()::TEXT || "id") FROM 1 FOR 10))
WHERE "joinCode" IS NULL;
ALTER TABLE "Group" ALTER COLUMN "joinCode" SET NOT NULL;

ALTER TABLE "Person" ADD COLUMN "userId" TEXT;

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "EmailVerificationCode_email_purpose_consumedAt_idx" ON "EmailVerificationCode"("email", "purpose", "consumedAt");
CREATE UNIQUE INDEX "Group_joinCode_key" ON "Group"("joinCode");
CREATE UNIQUE INDEX "Person_groupId_userId_key" ON "Person"("groupId", "userId");
CREATE INDEX "Person_userId_idx" ON "Person"("userId");
CREATE UNIQUE INDEX "MembershipRequest_userId_groupId_key" ON "MembershipRequest"("userId", "groupId");
CREATE INDEX "MembershipRequest_groupId_status_idx" ON "MembershipRequest"("groupId", "status");

ALTER TABLE "Person" ADD CONSTRAINT "Person_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MembershipRequest" ADD CONSTRAINT "MembershipRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MembershipRequest" ADD CONSTRAINT "MembershipRequest_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MembershipRequest" ADD CONSTRAINT "MembershipRequest_reviewedByPersonId_fkey" FOREIGN KEY ("reviewedByPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
