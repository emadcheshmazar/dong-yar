import Link from "next/link";
import { Eye, PlusCircle, Search } from "lucide-react";
import { AppShell } from "@/components/nav";
import { Badge } from "@/components/badge";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { requirePerson } from "@/lib/auth";
import { getExpenses, getPeople } from "@/lib/queries";
import { formatDate, formatToman } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ExpensesPage({
  params: routeParams,
  searchParams,
}: {
  params: Promise<{ group: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { group } = await routeParams;
  const current = await requirePerson(group);
  const params = await searchParams;
  const [expenses, people] = await Promise.all([getExpenses(current.groupId), getPeople(current.groupId)]);
  const prefix = `/${current.group.slug}`;
  const query = params.q ?? "";
  const payer = params.payer ?? "";
  const status = params.status ?? "all";
  const from = params.from ? new Date(params.from) : null;
  const to = params.to ? new Date(params.to) : null;
  const filtered = expenses.filter((expense) => {
    const unpaid = expense.participants.filter((p) => p.personId !== expense.paidByPersonId && p.paymentStatus === "UNPAID").length;
    const matchesQuery = !query || expense.title.includes(query) || expense.paidBy.name.includes(query);
    const matchesPayer = !payer || expense.paidByPersonId === payer;
    const matchesStatus = status === "all" || (status === "open" ? unpaid > 0 : unpaid === 0);
    const date = new Date(expense.date);
    const matchesFrom = !from || date >= from;
    const matchesTo = !to || date <= to;
    return matchesQuery && matchesPayer && matchesStatus && matchesFrom && matchesTo;
  });
  return (
    <AppShell groupSlug={current.group.slug}>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black">همه خرج‌ها</h1>
          <p className="mt-1 text-sm text-slate-600">همه می‌بینن، همه می‌تونن خرج ثبت کنن.</p>
        </div>
        <Link className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white" href={`${prefix}/expenses/new`}>
          <PlusCircle className="size-4" />
          ثبت خرج جدید
        </Link>
      </div>
      <Card className="mb-5">
        <form className="grid gap-3 md:grid-cols-5">
          <div className="relative md:col-span-2">
            <Search className="absolute right-3 top-3 size-4 text-slate-400" />
            <Input name="q" defaultValue={query} className="pr-10" placeholder="جستجو در عنوان یا پرداخت‌کننده" />
          </div>
          <Input name="from" type="date" defaultValue={params.from ?? ""} />
          <Input name="to" type="date" defaultValue={params.to ?? ""} />
          <Select name="payer" defaultValue={payer}>
            <option value="">همه پرداخت‌کننده‌ها</option>
            {people.members.map((member) => (
              <option key={member.id} value={member.id}>{member.name}</option>
            ))}
          </Select>
          <Select name="status" defaultValue={status}>
            <option value="all">همه وضعیت‌ها</option>
            <option value="open">باز</option>
            <option value="paid">تسویه شده</option>
          </Select>
          <button className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white md:col-span-5">اعمال فیلتر</button>
        </form>
      </Card>
      <div className="space-y-3">
        {filtered.map((expense) => {
          const unpaid = expense.participants.filter((p) => p.personId !== expense.paidByPersonId && p.paymentStatus === "UNPAID");
          const share = expense.participants[0]?.shareAmount ?? 0;
          return (
            <Card key={expense.id} className="grid gap-4 md:grid-cols-[120px_1fr_130px_120px_120px_1fr_70px] md:items-center">
              <span className="text-sm text-slate-500">{formatDate(expense.date)}</span>
              <div>
                <p className="font-black">{expense.title}</p>
                <p className="text-sm text-slate-500">پرداخت‌کننده: {expense.paidBy.name}</p>
              </div>
              <span className="font-black">{formatToman(expense.amount)}</span>
              <span className="text-sm">{expense.participants.length} نفر</span>
              <span className="text-sm">{formatToman(share)}</span>
              <Badge tone={unpaid.length ? "amber" : "green"}>{unpaid.length ? `${unpaid.length} نفر هنوز دنگ ندادن` : "همه حساب کردن"}</Badge>
              <Link className="inline-flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800" href={`${prefix}/expenses/${expense.id}`}>
                <Eye className="size-4" />
              </Link>
            </Card>
          );
        })}
        {!filtered.length ? <Card className="text-center font-bold text-slate-600">خرجی با این فیلتر پیدا نشد.</Card> : null}
      </div>
    </AppShell>
  );
}
