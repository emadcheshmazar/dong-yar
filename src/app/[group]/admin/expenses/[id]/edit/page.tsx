import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { deleteExpenseAction } from "@/app/actions";
import { ExpenseForm } from "@/components/expense-form";
import { requireGroupAdmin } from "@/lib/auth";
import { getExpense, getPeople } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function GroupAdminEditExpensePage({
  params,
}: {
  params: Promise<{ group: string; id: string }>;
}) {
  const { group, id } = await params;
  const admin = await requireGroupAdmin(group);
  const [expense, peopleByType] = await Promise.all([getExpense(admin.groupId, id), getPeople(admin.groupId)]);
  if (!expense) notFound();
  const people = [...peopleByType.members, ...peopleByType.guests];

  return (
    <main className="min-h-screen bg-[#f8faf2] px-4 py-6 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <Link href={`/${admin.group.slug}/admin`} className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-700">
          <ArrowRight className="size-4" />
          برگشت به پنل گروه
        </Link>
        <div className="mb-6">
          <h1 className="text-3xl font-black">ویرایش خرج</h1>
          <p className="mt-1 text-sm text-slate-600">این تغییر فقط روی گروه {admin.group.name} اعمال می‌شود.</p>
        </div>
        <ExpenseForm groupSlug={admin.group.slug} people={people} currentPersonId={expense.paidByPersonId} expense={expense} adminMode managerScope="group" />
        <form id="delete-expense" action={deleteExpenseAction}>
          <input type="hidden" name="adminMode" value="on" />
          <input type="hidden" name="managerScope" value="group" />
          <input type="hidden" name="groupSlug" value={admin.group.slug} />
          <input type="hidden" name="id" value={expense.id} />
        </form>
      </div>
    </main>
  );
}
