import { notFound, redirect } from "next/navigation";
import { deleteExpenseAction } from "@/app/actions";
import { AppShell } from "@/components/nav";
import { ExpenseForm } from "@/components/expense-form";
import { requirePerson } from "@/lib/auth";
import { getActivePeople, getExpense } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, current] = await Promise.all([params, requirePerson()]);
  const expense = await getExpense(id);
  if (!expense) notFound();
  if (expense.createdByPersonId !== current.id) redirect(`/expenses/${expense.id}`);
  const people = await getActivePeople();
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-black">ویرایش خرج</h1>
        <p className="mt-1 text-sm text-slate-600">ویرایش خرج ممکن است وضعیت بدهی‌ها را تغییر دهد.</p>
      </div>
      <ExpenseForm people={people} currentPersonId={current.id} expense={expense} />
      <form id="delete-expense" action={deleteExpenseAction}>
        <input type="hidden" name="id" value={expense.id} />
      </form>
    </AppShell>
  );
}
