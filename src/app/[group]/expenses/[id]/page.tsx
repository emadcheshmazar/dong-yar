import Link from "next/link";
import { notFound } from "next/navigation";
import { PersonType } from "@prisma/client";
import { Pencil, Trash2 } from "lucide-react";
import { AppShell } from "@/components/nav";
import { Badge } from "@/components/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyableText } from "@/components/copyable-text";
import { ParticipantShareForm } from "@/components/participant-share-form";
import { MarkPaidButton, ToggleGuestPaymentButton } from "@/components/payment-buttons";
import { deleteExpenseAction } from "@/app/actions";
import { requirePerson } from "@/lib/auth";
import { getExpense } from "@/lib/queries";
import {
  countEnteredShares,
  formatDate,
  formatExpenseAmount,
  formatToman,
  isCustomExpenseComplete,
  isCustomSplit,
  splitModeLabels,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ExpenseDetailPage({ params }: { params: Promise<{ group: string; id: string }> }) {
  const { group, id } = await params;
  const current = await requirePerson(group);
  const expense = await getExpense(current.groupId, id);
  if (!expense) notFound();
  const isCustom = isCustomSplit(expense.splitMode);
  const paid = expense.participants.filter((p) => p.paymentStatus === "PAID");
  const unpaid = expense.participants.filter(
    (p) => p.personId !== expense.paidByPersonId && p.paymentStatus === "UNPAID" && p.shareAmount != null,
  );
  const equalShare = expense.participants.find((p) => p.personId !== expense.paidByPersonId)?.shareAmount ?? expense.participants[0]?.shareAmount ?? 0;
  const isCreator = expense.createdByPersonId === current.id;
  const enteredShares = countEnteredShares(expense.participants);
  const isComplete = isCustomExpenseComplete(expense.participants);

  return (
    <AppShell groupSlug={current.group.slug}>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black sm:text-3xl">{expense.title}</h1>
            <Badge tone={isCustom ? "sky" : "slate"}>{splitModeLabels[expense.splitMode]}</Badge>
            {isCustom && !isComplete ? <Badge tone="amber">در حال تکمیل سهم‌ها</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-slate-600">پرداخت‌کننده: {expense.paidBy.name}، تاریخ {formatDate(expense.date)}</p>
        </div>
        {isCreator ? (
          <div className="flex flex-wrap gap-2">
            <Link className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-100 px-4 text-sm font-bold text-amber-950" href={`/${current.group.slug}/expenses/${expense.id}/edit`}>
              <Pencil className="size-4" />
              ویرایش خرج
            </Link>
            <form action={deleteExpenseAction}>
              <input type="hidden" name="groupSlug" value={current.group.slug} />
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
      <section className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Card>
          <p className="text-sm text-slate-500">مبلغ کل</p>
          <b className="mt-2 block text-xl">{formatExpenseAmount(expense)}</b>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">{isCustom ? "سهم‌های ثبت‌شده" : "سهم هر نفر"}</p>
          <b className="mt-2 block text-xl">
            {isCustom ? `${enteredShares}/${expense.participants.length}` : formatToman(equalShare ?? 0)}
          </b>
        </Card>
        <Card><p className="text-sm text-slate-500">تعداد نفرات</p><b className="mt-2 block text-xl">{expense.participants.length}</b></Card>
        <Card><p className="text-sm text-slate-500">پرداخت شده</p><b className="mt-2 block text-xl">{paid.length}</b></Card>
        <Card><p className="text-sm text-slate-500">پرداخت نشده</p><b className="mt-2 block text-xl">{unpaid.length}</b></Card>
      </section>
      {(expense.cardNumber || expense.paymentNote || expense.description) ? (
        <Card className="mt-5 bg-amber-50">
          {expense.cardNumber ? (
            <p className="flex flex-wrap items-center gap-2">
              <b>شماره کارت:</b>
              <CopyableText value={expense.cardNumber} />
            </p>
          ) : null}
          {expense.paymentNote ? <p><b>یادداشت پرداخت:</b> {expense.paymentNote}</p> : null}
          {expense.description ? <p><b>توضیحات:</b> {expense.description}</p> : null}
        </Card>
      ) : null}
      {isCustom ? (
        <Card className="mt-5 bg-sky-50">
          <h2 className="mb-2 text-lg font-black text-sky-950">خرج سفارشی</h2>
          <p className="text-sm text-sky-900">
            هر عضو سهم خودش را وارد یا ویرایش می‌کند. ادمین گروه برای مهمان‌ها و بقیه سهم تعیین می‌کند. بقیه فقط سهم اعلام‌شده را می‌بینند.
          </p>
        </Card>
      ) : null}
      <Card className="mt-5">
        <h2 className="mb-4 text-xl font-black">شرکت‌کننده‌ها</h2>
        <div className="space-y-3">
          {expense.participants.map((participant) => {
            const isPayer = participant.personId === expense.paidByPersonId;
            const isOwnRow = participant.personId === current.id;
            const isGuest = participant.person.type === PersonType.GUEST;
            const canEditShare =
              isCustom && (current.isGroupAdmin || (isOwnRow && participant.person.type === PersonType.MEMBER));
            const isOwnDebt =
              isOwnRow &&
              !isPayer &&
              participant.paymentStatus === "UNPAID" &&
              participant.shareAmount != null;
            return (
              <div key={participant.id} className="grid gap-3 rounded-2xl border border-slate-100 p-4 lg:grid-cols-[1fr_220px_150px_220px] lg:items-center">
                <div>
                  <p className="font-black">{participant.person.name}</p>
                  <Badge tone={isGuest ? "sky" : "slate"}>
                    {isGuest ? "مهمان — سهم توسط ادمین" : "عضو ثابت"}
                  </Badge>
                </div>
                <div>
                  {isCustom ? (
                    <ParticipantShareForm
                      groupSlug={current.group.slug}
                      expenseId={expense.id}
                      participantId={participant.id}
                      currentShare={participant.shareAmount}
                      canEdit={canEditShare}
                    />
                  ) : (
                    <span className="font-bold">{formatToman(participant.shareAmount ?? 0)}</span>
                  )}
                </div>
                <Badge tone={isPayer ? "green" : participant.paymentStatus === "PAID" ? "green" : "rose"}>
                  {isPayer ? "پرداخت‌کننده" : participant.paymentStatus === "PAID" ? "پرداخت کرده" : "پرداخت نکرده"}
                </Badge>
                <div>
                  {isOwnDebt ? (
                    <MarkPaidButton
                      groupSlug={current.group.slug}
                      expenseId={expense.id}
                      payer={expense.paidBy.name}
                      amount={participant.shareAmount ?? 0}
                      note={expense.cardNumber || expense.paymentNote}
                    />
                  ) : participant.person.type === PersonType.GUEST && !isPayer && participant.shareAmount != null ? (
                    <ToggleGuestPaymentButton groupSlug={current.group.slug} participantId={participant.id} />
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
