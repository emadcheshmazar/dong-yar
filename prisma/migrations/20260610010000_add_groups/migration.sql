CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Group_slug_key" ON "Group"("slug");

ALTER TABLE "Person" ADD COLUMN "groupId" TEXT;
ALTER TABLE "Expense" ADD COLUMN "groupId" TEXT;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Person") OR EXISTS (SELECT 1 FROM "Expense") THEN
    INSERT INTO "Group" ("id", "name", "slug", "isActive", "createdAt", "updatedAt")
    VALUES ('legacy', 'Legacy', 'legacy', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("slug") DO NOTHING;

    UPDATE "Person" SET "groupId" = 'legacy' WHERE "groupId" IS NULL;
    UPDATE "Expense" SET "groupId" = 'legacy' WHERE "groupId" IS NULL;
  END IF;
END $$;

ALTER TABLE "Person" ALTER COLUMN "groupId" SET NOT NULL;
ALTER TABLE "Expense" ALTER COLUMN "groupId" SET NOT NULL;

DROP INDEX IF EXISTS "Person_username_key";
CREATE UNIQUE INDEX "Person_groupId_username_key" ON "Person"("groupId", "username");

ALTER TABLE "Person" ADD CONSTRAINT "Person_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
