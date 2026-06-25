"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeftRight, HandCoins, Scale, WalletCards } from "lucide-react";
import { confirmNettingAction } from "@/app/actions";
import { Badge } from "@/components/badge";
import { CopyableText } from "@/components/copyable-text";
import { MarkPaidButton } from "@/components/payment-buttons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { describeNettingResult } from "@/lib/netting";
import { formatDate, formatToman } from "@/lib/utils";

type DebtItem = {
  expense: {
    id: string;
    title: string;
    date: string;
    cardNumber: string | null;
    paymentNote: string | null;
    paidBy: { name: string };
  };
  participant: {
    id: string;
    shareAmount: number | null;
    nettedAmount: number;
  };
  amount: number;
};

type ReceivableItem = {
  expense: {
    id: string;
    title: string;
    date: string;
  };
  participant: {
    id: string;
    person: { name: string };
    shareAmount: number | null;
    nettedAmount: number;
  };
  amount: number;
};

type PairSummary = {
  counterpartyId: string;
  counterpartyName: string;
  debtItems: Array<{ expenseId: string; expenseTitle: string; amount: number }>;
  receivableItems: Array<{ expenseId: string; expenseTitle: string; amount: number }>;
  openAccountCount: number;
  totalDebt: number;
  totalReceivable: number;
  nettedPreview: number;
  remainingDebt: number;
  remainingReceivable: number;
  canNet: boolean;
};

type NettingRecord = {
  id: string;
  createdAt: string;
  nettedAmount: number;
  initiator: { id: string; name: string };
  counterparty: { id: string; name: string };
  initiatorDebtBefore: number;
  initiatorReceivableBefore: number;
  initiatorDebtAfter: number;
  initiatorReceivableAfter: number;
  counterpartyDebtBefore: number;
  counterpartyReceivableBefore: number;
  counterpartyDebtAfter: number;
  counterpartyReceivableAfter: number;
  items: Array<{
    amount: number;
    entryType: "INITIATOR_OWES" | "COUNTERPARTY_OWES";
    participant: {
      expense: { id: string; title: string; date: string };
      person: { name: string };
    };
  }>;
};

export function DashboardSettlementSections({
  groupSlug,
  personId,
  personName,
  myDebts,
  myReceivables,
  pairSummaries,
  nettings,
}: {
  groupSlug: string;
  personId: string;
  personName: string;
  myDebts: DebtItem[];
  myReceivables: ReceivableItem[];
  pairSummaries: PairSummary[];
  nettings: NettingRecord[];
}) {
  const [nettingMode, setNettingMode] = useState(false);
  const prefix = `/${groupSlug}`;
  const eligiblePairs = useMemo(() => pairSummaries.filter((pair) => pair.canNet), [pairSummaries]);

  return (
    <section className="mt-6 space-y-5">
      <Card className="border-emerald-100 bg-emerald-50/60">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="size-5 text-emerald-700" />
              <h2 className="text-lg font-black text-emerald-950">حالت تهاتر</h2>
            </div>
            <p className="mt-2 text-sm leading-7 text-emerald-900">
              {nettingMode
                ? "حساب‌های باز با هر شخص جمع می‌شود و فقط تفاضل بدهی/طلب نمایش داده می‌شود."
                : "در حالت عادی، هر خرج جداگانه دیده می‌شود و می‌توانی «پرداخت شد» بزنی."}
            </p>
          </div>
          <Button
            type="button"
            variant={nettingMode ? "default" : "secondary"}
            onClick={() => setNettingMode((value) => !value)}
          >
            {nettingMode ? "خاموش کردن تهاتر" : "روشن کردن تهاتر"}
          </Button>
        </div>
        {nettingMode && eligiblePairs.length ? (
          <div className="mt-4 space-y-3">
            {eligiblePairs.map((pair) => (
              <NettingPreviewCard key={pair.counterpartyId} groupSlug={groupSlug} pair={pair} />
            ))}
          </div>
        ) : null}
        {nettingMode && !eligiblePairs.length ? (
          <p className="mt-4 rounded-2xl bg-white p-4 text-sm font-bold text-slate-600">
            فعلاً با هیچ کس شرایط تهاتر برقرار نیست. باید حداقل دو حساب باز داشته باشی و بدهی/طلب دوطرفه وجود داشته باشد.
          </p>
        ) : null}
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <WalletCards className="size-5 text-amber-600" />
          <h2 className="text-xl font-black">بدهی‌های من</h2>
        </div>
        <div className="space-y-3">
          {myDebts.length ? (
            myDebts.map(({ expense, participant, amount }) => (
              <div key={expense.id} className="rounded-2xl border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link className="font-black text-emerald-800" href={`${prefix}/expenses/${expense.id}`}>
                      {expense.title}
                    </Link>
                    <p className="text-sm text-slate-500">به {expense.paidBy.name}، {formatDate(new Date(expense.date))}</p>
                    {participant.nettedAmount > 0 ? (
                      <p className="mt-1 text-xs font-bold text-sky-700">
                        {formatToman(participant.nettedAmount)} از این خرج قبلاً تهاتر شده
                      </p>
                    ) : null}
                    {expense.cardNumber ? (
                      <div className="mt-2">
                        <CopyableText value={expense.cardNumber} label="شماره کارت:" />
                      </div>
                    ) : expense.paymentNote ? (
                      <p className="mt-2 text-sm text-slate-700">{expense.paymentNote}</p>
                    ) : null}
                  </div>
                  <Badge tone="amber">{formatToman(amount)}</Badge>
                </div>
                {!nettingMode ? (
                  <div className="mt-3">
                    <MarkPaidButton
                      groupSlug={groupSlug}
                      expenseId={expense.id}
                      payer={expense.paidBy.name}
                      amount={amount}
                      note={expense.cardNumber || expense.paymentNote}
                    />
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <p className="rounded-2xl bg-emerald-50 p-5 text-sm font-bold text-emerald-800">فعلاً بدهی باز نداری. چه سبک!</p>
          )}
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <HandCoins className="size-5 text-emerald-600" />
          <h2 className="text-xl font-black">طلب‌های من</h2>
        </div>
        <div className="space-y-3">
          {myReceivables.length ? (
            myReceivables.map(({ expense, participant, amount }) => (
              <div key={`${expense.id}-${participant.id}`} className="rounded-2xl border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link className="font-black text-emerald-800" href={`${prefix}/expenses/${expense.id}`}>
                      {expense.title}
                    </Link>
                    <p className="text-sm text-slate-500">
                      {participant.person.name} به تو بدهکار است، {formatDate(new Date(expense.date))}
                    </p>
                    {participant.nettedAmount > 0 ? (
                      <p className="mt-1 text-xs font-bold text-sky-700">
                        {formatToman(participant.nettedAmount)} از این طلب قبلاً تهاتر شده
                      </p>
                    ) : null}
                  </div>
                  <Badge tone="green">{formatToman(amount)}</Badge>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-600">فعلاً طلب بازی از کسی نداری.</p>
          )}
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <ArrowLeftRight className="size-5 text-sky-700" />
          <h2 className="text-xl font-black">تهاتر شده‌های من</h2>
        </div>
        <div className="space-y-3">
          {nettings.length ? (
            nettings.map((record) => (
              <NettingHistoryCard key={record.id} prefix={prefix} personId={personId} personName={personName} record={record} />
            ))
          ) : (
            <p className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-600">هنوز تهاتری ثبت نشده.</p>
          )}
        </div>
      </Card>
    </section>
  );
}

function NettingPreviewCard({ groupSlug, pair }: { groupSlug: string; pair: PairSummary }) {
  const [open, setOpen] = useState(false);
  const summaryText = describeNettingResult(pair);

  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <p className="font-black text-emerald-950">تهاتر با {pair.counterpartyName}</p>
          <p className="text-sm text-slate-600">
            {pair.openAccountCount} حساب باز: {formatToman(pair.totalDebt)} بدهی، {formatToman(pair.totalReceivable)} طلب
          </p>
          <p className="text-sm font-bold text-emerald-800">
            مبلغ قابل تهاتر: {formatToman(pair.nettedPreview)} — {summaryText}
          </p>
          <div className="grid gap-2 text-xs text-slate-600 md:grid-cols-2">
            <div className="rounded-xl bg-amber-50 p-3">
              <p className="font-bold text-amber-900">بدهی‌های من به {pair.counterpartyName}</p>
              <ul className="mt-2 space-y-1">
                {pair.debtItems.map((item) => (
                  <li key={item.expenseId}>
                    {item.expenseTitle}: {formatToman(item.amount)}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3">
              <p className="font-bold text-emerald-900">طلب‌های من از {pair.counterpartyName}</p>
              <ul className="mt-2 space-y-1">
                {pair.receivableItems.map((item) => (
                  <li key={item.expenseId}>
                    {item.expenseTitle}: {formatToman(item.amount)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          تایید تهاتر
        </Button>
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-xl font-black">تایید تهاتر با {pair.counterpartyName}</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              {formatToman(pair.nettedPreview)} تومان از بدهی و طلب متقابل سر به سر می‌شود. {summaryText}
            </p>
            <p className="mt-3 text-sm text-slate-500">
              {pair.counterpartyName} هم در داشبوردش همین تغییر را می‌بیند.
            </p>
            <form action={confirmNettingAction} className="mt-5 flex gap-2">
              <input type="hidden" name="groupSlug" value={groupSlug} />
              <input type="hidden" name="counterpartyPersonId" value={pair.counterpartyId} />
              <Button>بله، تهاتر کن</Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                انصراف
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NettingHistoryCard({
  prefix,
  personId,
  personName,
  record,
}: {
  prefix: string;
  personId: string;
  personName: string;
  record: NettingRecord;
}) {
  const isInitiator = record.initiator.id === personId;
  const otherName = isInitiator ? record.counterparty.name : record.initiator.name;
  const myDebtBefore = isInitiator ? record.initiatorDebtBefore : record.counterpartyDebtBefore;
  const myReceivableBefore = isInitiator ? record.initiatorReceivableBefore : record.counterpartyReceivableBefore;
  const myDebtAfter = isInitiator ? record.initiatorDebtAfter : record.counterpartyDebtAfter;
  const myReceivableAfter = isInitiator ? record.initiatorReceivableAfter : record.counterpartyReceivableAfter;
  const actorName = isInitiator ? personName : record.initiator.name;

  return (
    <div className="rounded-2xl border border-sky-100 bg-sky-50/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-black text-sky-950">
          تهاتر با {otherName} — {formatDate(new Date(record.createdAt))}
        </p>
        <Badge tone="green">{formatToman(record.nettedAmount)} تهاتر شد</Badge>
      </div>
      <p className="mt-2 text-sm text-slate-700">
        {isInitiator ? "تو این تهاتر را ثبت کردی." : `${actorName} این تهاتر را ثبت کرد.`}
      </p>
      <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
        <div className="rounded-xl bg-white p-3">
          <p className="font-bold text-slate-800">قبل از تهاتر</p>
          <p className="mt-1 text-slate-600">بدهی: {formatToman(myDebtBefore)}</p>
          <p className="text-slate-600">طلب: {formatToman(myReceivableBefore)}</p>
        </div>
        <div className="rounded-xl bg-white p-3">
          <p className="font-bold text-slate-800">بعد از تهاتر</p>
          <p className="mt-1 text-slate-600">بدهی: {formatToman(myDebtAfter)}</p>
          <p className="text-slate-600">طلب: {formatToman(myReceivableAfter)}</p>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {record.items.map((item) => (
          <div key={`${record.id}-${item.participant.expense.id}-${item.entryType}`} className="rounded-xl bg-white p-3 text-sm">
            <Link className="font-bold text-emerald-800" href={`${prefix}/expenses/${item.participant.expense.id}`}>
              {item.participant.expense.title}
            </Link>
            <p className="mt-1 text-slate-600">
              {item.entryType === "INITIATOR_OWES"
                ? isInitiator
                  ? `بدهی تو به ${otherName}`
                  : `بدهی ${record.initiator.name} به ${record.counterparty.name}`
                : isInitiator
                  ? `طلب تو از ${otherName}`
                  : `طلب ${record.initiator.name} از ${record.counterparty.name}`}
              {" — "}
              {formatToman(item.amount)} تهاتر شد
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
