import { describe, expect, it } from "vitest";
import { ExpenseSplitMode } from "@prisma/client";
import {
  calculatePayerShare,
  calculateReceivable,
  calculateShare,
  countEnteredShares,
  formatExpenseAmount,
  isCustomExpenseComplete,
  sumParticipantShares,
} from "@/lib/utils";

describe("expense calculations", () => {
  it("rounds each debtor share up to 1,000 toman and gives the difference to the payer", () => {
    expect(calculateShare(250_000, 8)).toBe(32_000);
    expect(calculatePayerShare(250_000, 8)).toBe(26_000);
    expect(calculatePayerShare(250_000, 8) + 7 * calculateShare(250_000, 8)).toBe(250_000);
  });

  it("handles empty and single-person expenses without division errors", () => {
    expect(calculateShare(50_000, 0)).toBe(0);
    expect(calculatePayerShare(50_000, 0)).toBe(0);
    expect(calculateShare(50_000, 1)).toBe(50_000);
    expect(calculatePayerShare(50_000, 1)).toBe(50_000);
    expect(calculateReceivable(50_000, 1)).toBe(0);
  });

  it("tracks and sums custom participant shares", () => {
    const participants = [{ shareAmount: 12_000 }, { shareAmount: null }, { shareAmount: 8_000 }];
    expect(countEnteredShares(participants)).toBe(2);
    expect(isCustomExpenseComplete(participants)).toBe(false);
    expect(sumParticipantShares(participants)).toBe(20_000);
  });

  it("shows progress until every custom share is entered", () => {
    const amount = formatExpenseAmount({
      splitMode: ExpenseSplitMode.CUSTOM,
      amount: 20_000,
      participants: [{ shareAmount: 12_000 }, { shareAmount: null }],
    });
    expect(amount).toContain("1/2 سهم");
  });
});
