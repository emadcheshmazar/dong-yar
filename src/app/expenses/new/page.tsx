import { AppShell } from "@/components/nav";
import { ExpenseForm } from "@/components/expense-form";
import { requirePerson } from "@/lib/auth";
import { getActivePeople } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function NewExpensePage() {
  const [person, people] = await Promise.all([requirePerson(), getActivePeople()]);
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-black">ثبت خرج جدید</h1>
        <p className="mt-1 text-sm text-slate-600">عنوان، مبلغ و آدم‌ها را بده؛ سهم هر نفر زنده حساب می‌شود.</p>
      </div>
      <ExpenseForm people={people} currentPersonId={person.id} />
    </AppShell>
  );
}
