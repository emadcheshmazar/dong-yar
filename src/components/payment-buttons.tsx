"use client";

import { useState } from "react";
import { CreditCard, RotateCcw } from "lucide-react";
import { markPaidAction, toggleGuestPaymentAction } from "@/app/actions";
import { JalaliDatePicker } from "@/components/jalali-date-picker";
import { Button } from "@/components/ui/button";
import { formatToman } from "@/lib/utils";

export function MarkPaidButton({
  groupSlug,
  expenseId,
  payer,
  amount,
  note,
}: {
  groupSlug: string;
  expenseId: string;
  payer: string;
  amount: number;
  note?: string | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        پرداخت شد
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-xl font-black">پرداخت کردی؟</h2>
            <p className="mt-2 text-sm text-slate-600">سیستم به حرفت اعتماد می‌کنه؛ پس الکی نزن 😄</p>
            <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm">
              <p>پرداخت‌کننده: <b>{payer}</b></p>
              <p>مبلغ: <b>{formatToman(amount)}</b></p>
              {note ? <p>اطلاعات پرداخت: <b>{note}</b></p> : null}
            </div>
            <form action={markPaidAction} className="mt-5 space-y-4">
              <input type="hidden" name="groupSlug" value={groupSlug} />
              <input type="hidden" name="expenseId" value={expenseId} />
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">تاریخ پرداخت (اختیاری)</span>
                <JalaliDatePicker name="paidAt" optional />
              </label>
              <div className="flex gap-2">
                <Button>
                  <CreditCard className="size-4" />
                  بله، پرداخت شد
                </Button>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  نه، برگرد
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function ToggleGuestPaymentButton({
  groupSlug,
  participantId,
  isPaid,
  personName,
}: {
  groupSlug: string;
  participantId: string;
  isPaid: boolean;
  personName: string;
}) {
  const [open, setOpen] = useState(false);
  if (isPaid) {
    return (
      <form action={toggleGuestPaymentAction}>
        <input type="hidden" name="groupSlug" value={groupSlug} />
        <input type="hidden" name="participantId" value={participantId} />
        <Button size="sm" variant="secondary">
          <RotateCcw className="size-4" />
          باز کردن پرداخت
        </Button>
      </form>
    );
  }

  return (
    <>
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <RotateCcw className="size-4" />
        ثبت پرداخت مهمان
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-xl font-black">ثبت پرداخت مهمان</h2>
            <p className="mt-2 text-sm text-slate-600">پرداخت {personName} را ثبت می‌کنی.</p>
            <form action={toggleGuestPaymentAction} className="mt-5 space-y-4">
              <input type="hidden" name="groupSlug" value={groupSlug} />
              <input type="hidden" name="participantId" value={participantId} />
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">تاریخ پرداخت (اختیاری)</span>
                <JalaliDatePicker name="paidAt" optional />
              </label>
              <div className="flex gap-2">
                <Button>
                  <CreditCard className="size-4" />
                  ثبت پرداخت
                </Button>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  انصراف
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
