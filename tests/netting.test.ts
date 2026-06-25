import { describe, expect, it } from "vitest";
import { allocateNetting, buildPairSummaries, getEffectiveUnpaidAmount } from "@/lib/netting";
import { PaymentStatus } from "@prisma/client";

describe("netting", () => {
  it("calculates effective unpaid after partial netting", () => {
    expect(
      getEffectiveUnpaidAmount({
        shareAmount: 200,
        nettedAmount: 100,
        paymentStatus: PaymentStatus.UNPAID,
      }),
    ).toBe(100);
  });

  it("builds pair summary and allocates offset across both sides", () => {
    const debtLines = [
      {
        participantId: "p1",
        expenseId: "e1",
        expenseTitle: "ناهار",
        expenseDate: new Date("2026-01-01"),
        amount: 100,
        counterpartyId: "reza",
        counterpartyName: "رضا",
      },
      {
        participantId: "p2",
        expenseId: "e2",
        expenseTitle: "شام",
        expenseDate: new Date("2026-01-02"),
        amount: 200,
        counterpartyId: "reza",
        counterpartyName: "رضا",
      },
    ];
    const receivableLines = [
      {
        participantId: "p3",
        expenseId: "e3",
        expenseTitle: "صبحانه",
        expenseDate: new Date("2026-01-03"),
        amount: 400,
        counterpartyId: "reza",
        counterpartyName: "رضا",
      },
    ];

    const [pair] = buildPairSummaries(debtLines, receivableLines);
    expect(pair?.canNet).toBe(true);
    expect(pair?.nettedPreview).toBe(300);
    expect(pair?.remainingReceivable).toBe(100);

    const allocations = allocateNetting(pair!.debtItems, pair!.receivableItems, pair!.nettedPreview);
    expect(allocations.reduce((sum, item) => sum + item.amount, 0)).toBe(600);
    expect(
      allocations.filter((item) => item.entryType === "INITIATOR_OWES").reduce((sum, item) => sum + item.amount, 0),
    ).toBe(300);
    expect(
      allocations.filter((item) => item.entryType === "COUNTERPARTY_OWES").reduce((sum, item) => sum + item.amount, 0),
    ).toBe(300);
  });
});
