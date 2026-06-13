import { AppShell } from "@/components/nav";
import { ExpenseForm } from "@/components/expense-form";
import { requirePerson } from "@/lib/auth";
import { getActiveMembers } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function NewExpensePage({ params }: { params: Promise<{ group: string }> }) {
  const { group } = await params;
  const person = await requirePerson(group);
  const people = await getActiveMembers(person.groupId);
  return (
    <AppShell groupSlug={person.group.slug}>
      <div className="mb-6">
        <h1 className="text-3xl font-black">ثبت خرج جدید</h1>
        <p className="mt-1 text-sm text-slate-600">خرج مساوی یا سفارشی بساز؛ در حالت سفارشی هر نفر سهم خودش را وارد می‌کند.</p>
      </div>
      <ExpenseForm groupSlug={person.group.slug} people={people} currentPersonId={person.id} />
    </AppShell>
  );
}
