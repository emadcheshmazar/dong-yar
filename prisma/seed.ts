import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const shouldClear = process.argv.includes("--clear") || process.env.CLEAR_DATABASE === "true";

  if (!shouldClear) {
    console.log("No mock data was inserted. Existing database data was kept.");
    console.log("To intentionally clear all data, run: npm run db:clear");
    return;
  }

  await prisma.expenseParticipant.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.person.deleteMany();
  await prisma.group.deleteMany();

  console.log("Database cleared. No mock data was inserted.");
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
