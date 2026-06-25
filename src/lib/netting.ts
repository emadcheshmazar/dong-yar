import { NettingEntryType, PaymentStatus } from "@prisma/client";

export type SettlementParticipant = {
  shareAmount: number | null;
  nettedAmount: number;
  paymentStatus: PaymentStatus;
};

export function getEffectiveUnpaidAmount(participant: SettlementParticipant) {
  if (participant.shareAmount == null) return 0;
  if (participant.paymentStatus === PaymentStatus.PAID || participant.paymentStatus === PaymentStatus.NETTED) {
    return 0;
  }
  return Math.max(0, participant.shareAmount - participant.nettedAmount);
}

export type SettlementLineItem = {
  participantId: string;
  expenseId: string;
  expenseTitle: string;
  expenseDate: Date;
  amount: number;
};

export type PairSettlementSummary = {
  counterpartyId: string;
  counterpartyName: string;
  debtItems: SettlementLineItem[];
  receivableItems: SettlementLineItem[];
  openAccountCount: number;
  totalDebt: number;
  totalReceivable: number;
  nettedPreview: number;
  remainingDebt: number;
  remainingReceivable: number;
  canNet: boolean;
};

export type NettingAllocationUpdate = {
  participantId: string;
  addNetted: number;
  markFullyNetted: boolean;
  entryType: NettingEntryType;
  expenseId: string;
  expenseTitle: string;
  amount: number;
};

export function buildPairSummaries(
  debts: Array<SettlementLineItem & { counterpartyId: string; counterpartyName: string }>,
  receivables: Array<SettlementLineItem & { counterpartyId: string; counterpartyName: string }>,
) {
  const pairs = new Map<string, PairSettlementSummary>();

  for (const debt of debts) {
    const existing = pairs.get(debt.counterpartyId) ?? {
      counterpartyId: debt.counterpartyId,
      counterpartyName: debt.counterpartyName,
      debtItems: [],
      receivableItems: [],
      openAccountCount: 0,
      totalDebt: 0,
      totalReceivable: 0,
      nettedPreview: 0,
      remainingDebt: 0,
      remainingReceivable: 0,
      canNet: false,
    };
    existing.debtItems.push(debt);
    existing.totalDebt += debt.amount;
    pairs.set(debt.counterpartyId, existing);
  }

  for (const receivable of receivables) {
    const existing = pairs.get(receivable.counterpartyId) ?? {
      counterpartyId: receivable.counterpartyId,
      counterpartyName: receivable.counterpartyName,
      debtItems: [],
      receivableItems: [],
      openAccountCount: 0,
      totalDebt: 0,
      totalReceivable: 0,
      nettedPreview: 0,
      remainingDebt: 0,
      remainingReceivable: 0,
      canNet: false,
    };
    existing.receivableItems.push(receivable);
    existing.totalReceivable += receivable.amount;
    pairs.set(receivable.counterpartyId, existing);
  }

  return Array.from(pairs.values()).map((pair) => {
    const openAccountCount = pair.debtItems.length + pair.receivableItems.length;
    const nettedPreview = Math.min(pair.totalDebt, pair.totalReceivable);
    const remainingDebt = pair.totalDebt - nettedPreview;
    const remainingReceivable = pair.totalReceivable - nettedPreview;
    return {
      ...pair,
      openAccountCount,
      nettedPreview,
      remainingDebt,
      remainingReceivable,
      canNet: openAccountCount >= 2 && nettedPreview > 0,
    };
  });
}

function sortLineItems(items: SettlementLineItem[]) {
  return [...items].sort((left, right) => {
    const byDate = left.expenseDate.getTime() - right.expenseDate.getTime();
    if (byDate !== 0) return byDate;
    return left.expenseTitle.localeCompare(right.expenseTitle, "fa");
  });
}

export function allocateNetting(
  debtItems: SettlementLineItem[],
  receivableItems: SettlementLineItem[],
  offsetAmount: number,
) {
  const updates: NettingAllocationUpdate[] = [];

  const consume = (items: SettlementLineItem[], entryType: NettingEntryType) => {
    let remaining = offsetAmount;
    for (const item of sortLineItems(items)) {
      if (remaining <= 0) break;
      const take = Math.min(item.amount, remaining);
      if (take <= 0) continue;
      updates.push({
        participantId: item.participantId,
        addNetted: take,
        markFullyNetted: take === item.amount,
        entryType,
        expenseId: item.expenseId,
        expenseTitle: item.expenseTitle,
        amount: take,
      });
      remaining -= take;
    }
  };

  consume(debtItems, NettingEntryType.INITIATOR_OWES);
  consume(receivableItems, NettingEntryType.COUNTERPARTY_OWES);

  return updates;
}

export function describeNettingResult(summary: Pick<PairSettlementSummary, "remainingDebt" | "remainingReceivable">) {
  if (summary.remainingDebt > 0 && summary.remainingReceivable === 0) {
    return `بعد از تهاتر، ${summary.remainingDebt.toLocaleString("fa-IR")} تومان بدهی باقی می‌ماند.`;
  }
  if (summary.remainingReceivable > 0 && summary.remainingDebt === 0) {
    return `بعد از تهاتر، ${summary.remainingReceivable.toLocaleString("fa-IR")} تومان طلب باقی می‌ماند.`;
  }
  if (summary.remainingDebt === 0 && summary.remainingReceivable === 0) {
    return "بعد از تهاتر، حساب‌ها کامل صفر می‌شوند.";
  }
  return `بعد از تهاتر، ${summary.remainingDebt.toLocaleString("fa-IR")} تومان بدهی و ${summary.remainingReceivable.toLocaleString("fa-IR")} تومان طلب باقی می‌ماند.`;
}
