import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { deleteExpenseAction } from "@/app/actions";
import { ExpenseForm } from "@/components/expense-form";
import { requireAdmin } from "@/lib/auth";
import { getExpense, getGroupBySlug, getPeople } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminEditExpensePage({
  params,
}: {
  params: Promise<{ group: string; id: string }>;
}) {
  await requireAdmin();
  const { group: groupSlug, id } = await params;
  const group = await getGroupBySlug(groupSlug, true);
  if (!group) notFound();
  const [expense, peopleByType] = await Promise.all([getExpense(group.id, id), getPeople(group.id)]);
  if (!expense) notFound();
  const people = [...peopleByType.members, ...peopleByType.guests];

  return (
    <main className="min-h-screen bg-[#f8faf2] px-4 py-6 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <Link href={`/admin/groups/${group.slug}`} className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-700">
          <ArrowRight className="size-4" />
          برگشت به مدیریت گروه
        </Link>
        <div className="mb-6">
          <h1 className="text-3xl font-black">ویرایش خرج</h1>
          <p className="mt-1 text-sm text-slate-600">این تغییر فقط روی گروه {group.name} اعمال می‌شود.</p>
        </div>
        <ExpenseForm groupSlug={group.slug} people={people} currentPersonId={expense.paidByPersonId} expense={expense} adminMode />
        <form id="delete-expense" action={deleteExpenseAction}>
          <input type="hidden" name="adminMode" value="on" />
          <input type="hidden" name="groupSlug" value={group.slug} />
          <input type="hidden" name="id" value={expense.id} />
        </form>
      </div>
    </main>
  );
}
