import { notFound, redirect } from "next/navigation";
import { deleteExpenseAction } from "@/app/actions";
import { AppShell } from "@/components/nav";
import { ExpenseForm } from "@/components/expense-form";
import { requirePerson } from "@/lib/auth";
import { getActiveMembers, getExpense } from "@/lib/queries";
import { PersonType } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function EditExpensePage({ params }: { params: Promise<{ group: string; id: string }> }) {
  const { group, id } = await params;
  const current = await requirePerson(group);
  const expense = await getExpense(current.groupId, id);
  if (!expense) notFound();
  if (expense.createdByPersonId !== current.id) redirect(`/${current.group.slug}/expenses/${expense.id}`);
  const people = await getActiveMembers(current.groupId);
  const expenseGuests = expense.participants
    .map((participant) => participant.person)
    .filter((person) => person.type === PersonType.GUEST);
  return (
    <AppShell groupSlug={current.group.slug}>
      <div className="mb-6">
        <h1 className="text-3xl font-black">ویرایش خرج</h1>
        <p className="mt-1 text-sm text-slate-600">ویرایش خرج ممکن است وضعیت بدهی‌ها را تغییر دهد.</p>
      </div>
      <ExpenseForm
        groupSlug={current.group.slug}
        people={people}
        expenseGuests={expenseGuests}
        currentPersonId={current.id}
        expense={expense}
      />
      <form id="delete-expense" action={deleteExpenseAction}>
        <input type="hidden" name="groupSlug" value={current.group.slug} />
        <input type="hidden" name="id" value={expense.id} />
      </form>
    </AppShell>
  );
}
