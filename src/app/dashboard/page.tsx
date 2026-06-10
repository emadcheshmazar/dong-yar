import Link from "next/link";
import { ArrowLeft, Coffee, HandCoins, ReceiptText, WalletCards } from "lucide-react";
import { AppShell } from "@/components/nav";
import { Badge } from "@/components/badge";
import { Card } from "@/components/ui/card";
import { MarkPaidButton } from "@/components/payment-buttons";
import { requirePerson } from "@/lib/auth";
import { getDashboard } from "@/lib/queries";
import { formatDate, formatToman } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const person = await requirePerson();
  const data = await getDashboard(person.id);
  const cards = [
    { label: "خرج‌هایی که من کردم", value: data.spentByMe, icon: Coffee },
    { label: "طلب من", value: data.receivable, icon: HandCoins },
    { label: "بدهی من", value: data.debt, icon: WalletCards },
    { label: "مانده نهایی", value: data.balance, icon: ReceiptText },
  ];
  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black">داشبورد من</h1>
          <p className="mt-1 text-sm text-slate-600">سلام {person.name}، اینجا سهم‌ها و طلب‌ها را ساده می‌بینی.</p>
        </div>
        <Link className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white" href="/expenses/new">
          ثبت خرج جدید
          <ArrowLeft className="size-4" />
        </Link>
      </div>
      <section className="grid gap-4 md:grid-cols-4">
        {cards.map((item) => (
          <Card key={item.label} className="bg-white/90">
            <item.icon className="mb-4 size-6 text-emerald-600" />
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-2 text-2xl font-black">{formatToman(item.value)}</p>
          </Card>
        ))}
      </section>
      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-xl font-black">بدهی‌های من</h2>
          <div className="space-y-3">
            {data.myDebts.length ? (
              data.myDebts.map(({ expense, participant }) => (
                <div key={expense.id} className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link className="font-black text-emerald-800" href={`/expenses/${expense.id}`}>{expense.title}</Link>
                      <p className="text-sm text-slate-500">به {expense.paidBy.name}، {formatDate(expense.date)}</p>
                      {expense.cardNumber || expense.paymentNote ? (
                        <p className="mt-2 text-sm text-slate-700">{expense.cardNumber || expense.paymentNote}</p>
                      ) : null}
                    </div>
                    <Badge tone="amber">{formatToman(participant?.shareAmount ?? 0)}</Badge>
                  </div>
                  <div className="mt-3">
                    <MarkPaidButton
                      expenseId={expense.id}
                      payer={expense.paidBy.name}
                      amount={participant?.shareAmount ?? 0}
                      note={expense.cardNumber || expense.paymentNote}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-2xl bg-emerald-50 p-5 text-sm font-bold text-emerald-800">فعلا بدهی باز نداری. چه سبک!</p>
            )}
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 text-xl font-black">خرج‌هایی که من ثبت کردم</h2>
          <div className="space-y-3">
            {data.paidByMe.length ? (
              data.paidByMe.map((expense) => {
                const unpaid = expense.participants.filter((p) => p.personId !== person.id && p.paymentStatus === "UNPAID");
                const paid = expense.participants.filter((p) => p.paymentStatus === "PAID");
                return (
                  <div key={expense.id} className="rounded-2xl border border-slate-100 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <Link href={`/expenses/${expense.id}`} className="font-black text-emerald-800">{expense.title}</Link>
                      <Badge tone={unpaid.length ? "rose" : "green"}>{unpaid.length ? `${unpaid.length} نفر هنوز دنگ ندادن` : "همه حساب کردن"}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {formatToman(expense.amount)}، {expense.participants.length} نفر، {paid.length} پرداخت شده
                    </p>
                    {unpaid.length ? <p className="mt-1 text-xs text-slate-500">باز: {unpaid.map((p) => p.person.name).join("، ")}</p> : null}
                  </div>
                );
              })
            ) : (
              <p className="rounded-2xl bg-amber-50 p-5 text-sm font-bold text-amber-900">هنوز خرجی از طرف تو ثبت نشده.</p>
            )}
          </div>
        </Card>
      </section>
      <Card className="mt-6">
        <h2 className="mb-4 text-xl font-black">آخرین خرج‌ها</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {data.expenses.slice(0, 6).map((expense) => (
            <Link key={expense.id} href={`/expenses/${expense.id}`} className="rounded-2xl border border-slate-100 p-4 hover:bg-emerald-50">
              <p className="font-black">{expense.title}</p>
              <p className="mt-1 text-sm text-slate-500">{expense.paidBy.name}، {formatToman(expense.amount)}</p>
            </Link>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}
