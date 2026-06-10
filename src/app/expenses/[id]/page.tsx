import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { AppShell } from "@/components/nav";
import { Badge } from "@/components/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MarkPaidButton, ToggleGuestPaymentButton } from "@/components/payment-buttons";
import { deleteExpenseAction } from "@/app/actions";
import { requirePerson } from "@/lib/auth";
import { getExpense } from "@/lib/queries";
import { formatDate, formatToman } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, current] = await Promise.all([params, requirePerson()]);
  const expense = await getExpense(id);
  if (!expense) notFound();
  const paid = expense.participants.filter((p) => p.paymentStatus === "PAID");
  const unpaid = expense.participants.filter((p) => p.personId !== expense.paidByPersonId && p.paymentStatus === "UNPAID");
  const share = expense.participants[0]?.shareAmount ?? 0;
  const isCreator = expense.createdByPersonId === current.id;
  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-black">{expense.title}</h1>
          <p className="mt-1 text-sm text-slate-600">پرداخت‌کننده: {expense.paidBy.name}، تاریخ {formatDate(expense.date)}</p>
        </div>
        {isCreator ? (
          <div className="flex gap-2">
            <Link className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-100 px-4 text-sm font-bold text-amber-950" href={`/expenses/${expense.id}/edit`}>
              <Pencil className="size-4" />
              ویرایش خرج
            </Link>
            <form action={deleteExpenseAction}>
              <input type="hidden" name="id" value={expense.id} />
              <Button variant="danger">
                <Trash2 className="size-4" />
                حذف خرج
              </Button>
            </form>
          </div>
        ) : (
          <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600">فقط ثبت‌کننده خرج می‌تواند ویرایش کند.</p>
        )}
      </div>
      <section className="grid gap-4 md:grid-cols-5">
        <Card><p className="text-sm text-slate-500">مبلغ کل</p><b className="mt-2 block text-xl">{formatToman(expense.amount)}</b></Card>
        <Card><p className="text-sm text-slate-500">سهم هر نفر</p><b className="mt-2 block text-xl">{formatToman(share)}</b></Card>
        <Card><p className="text-sm text-slate-500">تعداد نفرات</p><b className="mt-2 block text-xl">{expense.participants.length}</b></Card>
        <Card><p className="text-sm text-slate-500">پرداخت شده</p><b className="mt-2 block text-xl">{paid.length}</b></Card>
        <Card><p className="text-sm text-slate-500">پرداخت نشده</p><b className="mt-2 block text-xl">{unpaid.length}</b></Card>
      </section>
      {(expense.cardNumber || expense.paymentNote || expense.description) ? (
        <Card className="mt-5 bg-amber-50">
          {expense.cardNumber ? <p><b>شماره کارت:</b> {expense.cardNumber}</p> : null}
          {expense.paymentNote ? <p><b>یادداشت پرداخت:</b> {expense.paymentNote}</p> : null}
          {expense.description ? <p><b>توضیحات:</b> {expense.description}</p> : null}
        </Card>
      ) : null}
      <Card className="mt-5">
        <h2 className="mb-4 text-xl font-black">شرکت‌کننده‌ها</h2>
        <div className="space-y-3">
          {expense.participants.map((participant) => {
            const isPayer = participant.personId === expense.paidByPersonId;
            const isOwnDebt = participant.personId === current.id && !isPayer && participant.paymentStatus === "UNPAID";
            return (
              <div key={participant.id} className="grid gap-3 rounded-2xl border border-slate-100 p-4 md:grid-cols-[1fr_140px_150px_220px] md:items-center">
                <div>
                  <p className="font-black">{participant.person.name}</p>
                  <Badge tone={participant.person.type === "GUEST" ? "sky" : "slate"}>{participant.person.type === "GUEST" ? "مهمان" : "عضو ثابت"}</Badge>
                </div>
                <span className="font-bold">{formatToman(participant.shareAmount)}</span>
                <Badge tone={isPayer ? "green" : participant.paymentStatus === "PAID" ? "green" : "rose"}>
                  {isPayer ? "پرداخت‌کننده" : participant.paymentStatus === "PAID" ? "پرداخت کرده" : "پرداخت نکرده"}
                </Badge>
                <div>
                  {isOwnDebt ? (
                    <MarkPaidButton expenseId={expense.id} payer={expense.paidBy.name} amount={participant.shareAmount} note={expense.cardNumber || expense.paymentNote} />
                  ) : participant.person.type === "GUEST" && !isPayer ? (
                    <ToggleGuestPaymentButton participantId={participant.id} />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </AppShell>
  );
}
