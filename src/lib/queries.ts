import { ExpenseStatus, PaymentStatus, PersonType } from "@prisma/client";
import { prisma } from "@/lib/db";

export const expenseInclude = {
  paidBy: true,
  createdBy: true,
  participants: {
    include: { person: true },
    orderBy: { createdAt: "asc" as const },
  },
};

export async function getPeople() {
  const people = await prisma.person.findMany({
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
  });
  return {
    members: people.filter((p) => p.type === PersonType.MEMBER),
    guests: people.filter((p) => p.type === PersonType.GUEST),
  };
}

export async function getActivePeople() {
  return prisma.person.findMany({
    where: { isActive: true },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
  });
}

export async function getExpenses() {
  return prisma.expense.findMany({
    where: { status: ExpenseStatus.ACTIVE },
    include: expenseInclude,
    orderBy: { date: "desc" },
  });
}

export async function getExpense(id: string) {
  return prisma.expense.findFirst({
    where: { id, status: ExpenseStatus.ACTIVE },
    include: expenseInclude,
  });
}

export async function getDashboard(personId: string) {
  const expenses = await getExpenses();
  const myDebts = expenses
    .map((expense) => ({
      expense,
      participant: expense.participants.find((p) => p.personId === personId),
    }))
    .filter(
      (item) =>
        item.participant &&
        item.expense.paidByPersonId !== personId &&
        item.participant.paymentStatus === PaymentStatus.UNPAID,
    );
  const paidByMe = expenses.filter((e) => e.paidByPersonId === personId);
  const spentByMe = paidByMe.reduce((sum, e) => sum + e.amount, 0);
  const debt = myDebts.reduce((sum, item) => sum + (item.participant?.shareAmount ?? 0), 0);
  const receivable = paidByMe.reduce((sum, expense) => {
    return (
      sum +
      expense.participants
        .filter((p) => p.personId !== personId && p.paymentStatus === PaymentStatus.UNPAID)
        .reduce((inner, p) => inner + p.shareAmount, 0)
    );
  }, 0);

  return {
    expenses,
    myDebts,
    paidByMe,
    spentByMe,
    debt,
    receivable,
    balance: receivable - debt,
  };
}
