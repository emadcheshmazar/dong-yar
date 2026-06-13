import Link from "next/link";
import { Eye, PlusCircle } from "lucide-react";
import { AppShell } from "@/components/nav";
import { ExpensesFilterForm } from "@/components/expenses-filter-form";
import { Badge } from "@/components/badge";
import { Card } from "@/components/ui/card";
import { requirePerson } from "@/lib/auth";
import { getExpenses, getPeople } from "@/lib/queries";
import { formatDate, formatToman, parseInputDate } from "@/lib/utils";

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
  const from = params.from ? parseInputDate(params.from) : null;
  const toEnd = params.to ? new Date(parseInputDate(params.to).getTime() + 24 * 60 * 60 * 1000 - 1) : null;
  const filtered = expenses.filter((expense) => {
    const unpaid = expense.participants.filter((p) => p.personId !== expense.paidByPersonId && p.paymentStatus === "UNPAID").length;
    const matchesQuery = !query || expense.title.includes(query) || expense.paidBy.name.includes(query);
    const matchesPayer = !payer || expense.paidByPersonId === payer;
    const matchesStatus = status === "all" || (status === "open" ? unpaid > 0 : unpaid === 0);
    const date = new Date(expense.date);
    const matchesFrom = !from || date >= from;
    const matchesTo = !toEnd || date <= toEnd;
    return matchesQuery && matchesPayer && matchesStatus && matchesFrom && matchesTo;
  });
  return (
    <AppShell groupSlug={current.group.slug}>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-black sm:text-3xl">همه خرج‌ها</h1>
          <p className="mt-1 text-sm text-slate-600">همه می‌بینن، همه می‌تونن خرج ثبت کنن.</p>
        </div>
        <Link className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white" href={`${prefix}/expenses/new`}>
          <PlusCircle className="size-4" />
          ثبت خرج جدید
        </Link>
      </div>
      <Card className="mb-5">
        <ExpensesFilterForm
          query={query}
          from={params.from ?? ""}
          to={params.to ?? ""}
          payer={payer}
          status={status}
          members={people.members}
        />
      </Card>
      <div className="space-y-3">
        {filtered.map((expense) => {
          const unpaid = expense.participants.filter((p) => p.personId !== expense.paidByPersonId && p.paymentStatus === "UNPAID");
          const debtShare =
            expense.participants.find((participant) => participant.personId !== expense.paidByPersonId)?.shareAmount ??
            expense.participants[0]?.shareAmount ??
            0;
          return (
            <Card key={expense.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-black">{expense.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatDate(expense.date)} · پرداخت‌کننده: {expense.paidBy.name}
                  </p>
                </div>
                <Link
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800"
                  href={`${prefix}/expenses/${expense.id}`}
                >
                  <Eye className="size-4" />
                </Link>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-slate-500">مبلغ</dt>
                  <dd className="font-black">{formatToman(expense.amount)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">نفرات</dt>
                  <dd>{expense.participants.length} نفر</dd>
                </div>
                <div>
                  <dt className="text-slate-500">سهم</dt>
                  <dd>{formatToman(debtShare)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">وضعیت</dt>
                  <dd>
                    <Badge tone={unpaid.length ? "amber" : "green"}>
                      {unpaid.length ? `${unpaid.length} نفر هنوز دنگ ندادن` : "همه حساب کردن"}
                    </Badge>
                  </dd>
                </div>
              </dl>
            </Card>
          );
        })}
        {!filtered.length ? <Card className="text-center font-bold text-slate-600">خرجی با این فیلتر پیدا نشد.</Card> : null}
      </div>
    </AppShell>
  );
}
