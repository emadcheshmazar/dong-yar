import { ExpenseSplitMode, ExpenseStatus, PaymentStatus, PersonType } from "@prisma/client";
import { prisma } from "@/lib/db";

const personPublicSelect = {
  id: true,
  groupId: true,
  name: true,
  username: true,
  type: true,
  isGroupAdmin: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const expenseInclude = {
  paidBy: { select: personPublicSelect },
  createdBy: { select: personPublicSelect },
  participants: {
    include: { person: { select: personPublicSelect } },
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
    select: personPublicSelect,
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
  });
  return {
    members: people.filter((p) => p.type === PersonType.MEMBER),
    guests: people.filter((p) => p.type === PersonType.GUEST),
  };
}

export async function getActivePeople(groupId: string) {
  return getActiveMembers(groupId);
}

export async function getActiveMembers(groupId: string) {
  return prisma.person.findMany({
    where: { groupId, isActive: true, type: PersonType.MEMBER },
    select: personPublicSelect,
    orderBy: { createdAt: "asc" },
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

export async function getDashboard(groupId: string, personId: string, isGroupAdmin = false) {
  const expenses = await getExpenses(groupId);
  const myDebts = expenses
    .map((expense) => ({
      expense,
      participant: expense.participants.find((p) => p.personId === personId),
    }))
    .filter(
      (item) =>
        item.participant &&
        item.participant.shareAmount != null &&
        item.expense.paidByPersonId !== personId &&
        item.participant.paymentStatus === PaymentStatus.UNPAID,
    );
  const pendingCustomShares = expenses.filter(
    (expense) =>
      expense.splitMode === ExpenseSplitMode.CUSTOM &&
      expense.participants.some(
        (participant) => participant.personId === personId && participant.shareAmount == null,
      ),
  );
  const pendingGuestShares = isGroupAdmin
    ? expenses.filter(
        (expense) =>
          expense.splitMode === ExpenseSplitMode.CUSTOM &&
          expense.participants.some(
            (participant) => participant.person.type === PersonType.GUEST && participant.shareAmount == null,
          ),
      )
    : [];
  const paidByMe = expenses.filter((e) => e.paidByPersonId === personId);
  const spentByMe = paidByMe.reduce((sum, e) => sum + e.amount, 0);
  const debt = myDebts.reduce((sum, item) => sum + (item.participant?.shareAmount ?? 0), 0);
  const receivable = paidByMe.reduce((sum, expense) => {
    return (
      sum +
      expense.participants
        .filter(
          (p) =>
            p.personId !== personId &&
            p.shareAmount != null &&
            p.paymentStatus === PaymentStatus.UNPAID,
        )
        .reduce((inner, p) => inner + (p.shareAmount ?? 0), 0)
    );
  }, 0);

  return {
    expenses,
    myDebts,
    pendingCustomShares,
    pendingGuestShares,
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
      people: {
        where: { isGroupAdmin: true, type: PersonType.MEMBER },
        select: { id: true, name: true, isActive: true },
        orderBy: { createdAt: "asc" },
      },
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
        select: personPublicSelect,
        orderBy: [{ type: "asc" }, { createdAt: "asc" }],
      },
      membershipRequests: {
        include: {
          user: true,
          reviewedBy: { select: personPublicSelect },
        },
        orderBy: { requestedAt: "desc" },
      },
      expenses: {
        where: { status: ExpenseStatus.ACTIVE },
        include: expenseInclude,
        orderBy: { date: "desc" },
      },
    },
  });
}
