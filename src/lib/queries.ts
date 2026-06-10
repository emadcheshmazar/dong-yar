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

export async function getGroupBySlug(slug: string, includeInactive = false) {
  const normalizedSlug = slug.trim().toLowerCase();
  return prisma.group.findFirst({
    where: {
      slug: normalizedSlug,
      ...(includeInactive ? {} : { isActive: true }),
    },
  });
}

export async function getPeople(groupId: string) {
  const people = await prisma.person.findMany({
    where: { groupId },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
  });
  return {
    members: people.filter((p) => p.type === PersonType.MEMBER),
    guests: people.filter((p) => p.type === PersonType.GUEST),
  };
}

export async function getActivePeople(groupId: string) {
  return prisma.person.findMany({
    where: { groupId, isActive: true },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
  });
}

export async function getExpenses(groupId: string) {
  return prisma.expense.findMany({
    where: { groupId, status: ExpenseStatus.ACTIVE },
    include: expenseInclude,
    orderBy: { date: "desc" },
  });
}

export async function getExpense(groupId: string, id: string) {
  return prisma.expense.findFirst({
    where: { id, groupId, status: ExpenseStatus.ACTIVE },
    include: expenseInclude,
  });
}

export async function getDashboard(groupId: string, personId: string) {
  const expenses = await getExpenses(groupId);
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

export async function getAdminGroups() {
  return prisma.group.findMany({
    include: {
      _count: {
        select: {
          people: true,
          expenses: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAdminGroup(slug: string) {
  return prisma.group.findUnique({
    where: { slug },
    include: {
      people: {
        orderBy: [{ type: "asc" }, { createdAt: "asc" }],
      },
      expenses: {
        where: { status: ExpenseStatus.ACTIVE },
        include: expenseInclude,
        orderBy: { date: "desc" },
      },
    },
  });
}
