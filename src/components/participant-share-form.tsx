"use client";

import { useState } from "react";
import { updateParticipantShareAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatToman } from "@/lib/utils";

function formatPlainNumber(value: number) {
  return value ? new Intl.NumberFormat("en-US").format(value) : "";
}

function toNumber(value: string) {
  return Number(value.replace(/[^\d]/g, ""));
}

export function ParticipantShareForm({
  groupSlug,
  expenseId,
  participantId,
  currentShare,
  canEdit,
}: {
  groupSlug: string;
  expenseId: string;
  participantId: string;
  currentShare: number | null;
  canEdit: boolean;
}) {
  const [amount, setAmount] = useState(currentShare ?? 0);
  const [amountText, setAmountText] = useState(formatPlainNumber(currentShare ?? 0));

  if (!canEdit) {
    return (
      <div className="space-y-1">
        <span className="text-xs font-bold text-slate-500">
          {currentShare == null ? "سهم ثبت نشده" : "سهم اعلام‌شده"}
        </span>
        <span className="block font-bold text-slate-700">
          {currentShare == null ? "—" : formatToman(currentShare)}
        </span>
      </div>
    );
  }

  return (
    <form action={updateParticipantShareAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="groupSlug" value={groupSlug} />
      <input type="hidden" name="expenseId" value={expenseId} />
      <input type="hidden" name="participantId" value={participantId} />
      <input type="hidden" name="shareAmount" value={amount || ""} />
      <Input
        inputMode="numeric"
        value={amountText}
        onChange={(event) => {
          const nextAmount = toNumber(event.target.value);
          setAmount(nextAmount);
          setAmountText(formatPlainNumber(nextAmount));
        }}
        className="min-w-[8rem] flex-1"
        placeholder="مبلغ سهم"
        required
      />
      <Button size="sm" type="submit">
        {currentShare == null ? "ثبت سهم" : "به‌روزرسانی"}
      </Button>
    </form>
  );
}
