"use client";

import { useState } from "react";
import { CreditCard, RotateCcw } from "lucide-react";
import { markPaidAction, toggleGuestPaymentAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { formatToman } from "@/lib/utils";

export function MarkPaidButton({
  expenseId,
  payer,
  amount,
  note,
}: {
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
            <div className="mt-5 flex gap-2">
              <form action={markPaidAction}>
                <input type="hidden" name="expenseId" value={expenseId} />
                <Button>
                  <CreditCard className="size-4" />
                  بله، پرداخت شد
                </Button>
              </form>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                نه، برگرد
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function ToggleGuestPaymentButton({ participantId }: { participantId: string }) {
  return (
    <form action={toggleGuestPaymentAction}>
      <input type="hidden" name="participantId" value={participantId} />
      <Button size="sm" variant="secondary">
        <RotateCcw className="size-4" />
        تغییر وضعیت پرداخت
      </Button>
    </form>
  );
}
