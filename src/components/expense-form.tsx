"use client";

import { useMemo, useState } from "react";
import { Expense, ExpenseParticipant, ExpenseSplitMode } from "@prisma/client";
import { Plus, Search, Trash2 } from "lucide-react";
import { createExpenseAction, editExpenseAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { calculatePayerShare, calculateReceivable, calculateShare, formatToman, toInputDate } from "@/lib/utils";
import { JalaliDatePicker } from "@/components/jalali-date-picker";

type PersonOption = { id: string; name: string; username: string | null; type: string };
type ExpenseForEdit = Expense & { participants: ExpenseParticipant[] };

function formatPlainNumber(value: number) {
  return value ? new Intl.NumberFormat("en-US").format(value) : "";
}

function toNumber(value: string) {
  return Number(value.replace(/[^\d]/g, ""));
}

export function ExpenseForm({
  groupSlug,
  people,
  expenseGuests = [],
  currentPersonId,
  expense,
  adminMode = false,
  managerScope = "central",
}: {
  groupSlug: string;
  people: PersonOption[];
  expenseGuests?: PersonOption[];
  currentPersonId: string;
  expense?: ExpenseForEdit;
  adminMode?: boolean;
  managerScope?: "central" | "group";
}) {
  const isCustomExpense = expense?.splitMode === ExpenseSplitMode.CUSTOM;
  const lockParticipantList = Boolean(expense && isCustomExpense);
  const [splitMode, setSplitMode] = useState<ExpenseSplitMode>(expense?.splitMode ?? ExpenseSplitMode.EQUAL);
  const [amount, setAmount] = useState(expense?.amount ?? 0);
  const [amountText, setAmountText] = useState(formatPlainNumber(expense?.amount ?? 0));
  const [selected, setSelected] = useState<string[]>(expense?.participants.map((p) => p.personId) ?? [currentPersonId]);
  const [query, setQuery] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [localGuests, setLocalGuests] = useState<PersonOption[]>([]);
  const { showToast } = useToast();
  const allPeople = [...people, ...expenseGuests, ...localGuests];
  const filtered = allPeople.filter(
    (person) =>
      person.name.includes(query) ||
      (person.username ?? "").includes(query) ||
      person.id.includes(query),
  );
  const isCustom = splitMode === ExpenseSplitMode.CUSTOM;
  const debtShare = useMemo(() => calculateShare(amount, selected.length), [amount, selected.length]);
  const payerShare = useMemo(() => calculatePayerShare(amount, selected.length), [amount, selected.length]);
  const receivable = useMemo(() => calculateReceivable(amount, selected.length), [amount, selected.length]);
  const action = expense ? editExpenseAction : createExpenseAction;

  function toggle(id: string) {
    if (lockParticipantList) return;
    setSelected((items) => (items.includes(id) ? items.filter((item) => item !== id) : [...items, id]));
  }

  function addLocalGuest() {
    if (lockParticipantList) return;
    if (!guestName.trim()) {
      showToast({ type: "error", message: "نام مهمان را وارد کن." });
      return;
    }
    const name = guestName.trim();
    const id = `guest:${crypto.randomUUID()}`;
    setLocalGuests((items) => [...items, { id, name, username: null, type: "GUEST" }]);
    setSelected((items) => [...items, id]);
    setGuestName("");
    setGuestModalOpen(false);
    showToast({ type: "success", message: `مهمان ${name} به این خرج اضافه شد.` });
  }

  return (
    <form action={action} className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <input type="hidden" name="groupSlug" value={groupSlug} />
      <input type="hidden" name="splitMode" value={splitMode} />
      {adminMode ? <input type="hidden" name="adminMode" value="on" /> : null}
      {adminMode ? <input type="hidden" name="managerScope" value={managerScope} /> : null}
      {expense ? <input type="hidden" name="id" value={expense.id} /> : null}
      {!isCustom ? <input type="hidden" name="amount" value={amount || ""} /> : null}
      {localGuests.map((guest) => (
        <input key={guest.id} type="hidden" name="localGuests" value={`${guest.id}|||${guest.name}`} />
      ))}
      <Card className="space-y-5">
        {expense ? (
          <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800">
            {isCustomExpense
              ? "در خرج سفارشی فقط عنوان و جزئیات پرداخت قابل ویرایش است. سهم‌ها از صفحه خرج تنظیم می‌شوند."
              : "ویرایش خرج ممکن است وضعیت بدهی‌ها را تغییر دهد."}
          </p>
        ) : null}
        {!expense ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-100 p-4 has-checked:border-emerald-300 has-checked:bg-emerald-50">
              <input
                type="radio"
                name="splitModeChoice"
                checked={splitMode === ExpenseSplitMode.EQUAL}
                onChange={() => setSplitMode(ExpenseSplitMode.EQUAL)}
                className="size-5 accent-emerald-600"
              />
              <span>
                <span className="block font-black">خرج مساوی</span>
                <span className="text-xs text-slate-500">مبلغ کل را وارد می‌کنی و بین همه تقسیم می‌شود.</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-100 p-4 has-checked:border-emerald-300 has-checked:bg-emerald-50">
              <input
                type="radio"
                name="splitModeChoice"
                checked={splitMode === ExpenseSplitMode.CUSTOM}
                onChange={() => setSplitMode(ExpenseSplitMode.CUSTOM)}
                className="size-5 accent-emerald-600"
              />
              <span>
                <span className="block font-black">خرج سفارشی</span>
                <span className="text-xs text-slate-500">هر نفر سهم خودش را جداگانه وارد می‌کند. مهمان هم اضافه کن؛ سهم مهمان را ادمین تعیین می‌کند.</span>
              </span>
            </label>
          </div>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-bold">عنوان خرج</span>
            <Input name="title" defaultValue={expense?.title} placeholder="مثلا بستنی تابستانی" required />
          </label>
          {!isCustom ? (
            <label className="space-y-2">
              <span className="text-sm font-bold">مبلغ کل</span>
              <Input
                inputMode="numeric"
                value={amountText}
                onChange={(event) => {
                  const nextAmount = toNumber(event.target.value);
                  setAmount(nextAmount);
                  setAmountText(formatPlainNumber(nextAmount));
                }}
                placeholder="850,000"
                required
              />
            </label>
          ) : (
            <div className="rounded-2xl bg-sky-50 p-4 text-sm font-bold text-sky-900">
              مبلغ نهایی بعد از ثبت سهم همه مشخص می‌شود.
            </div>
          )}
          <label className="space-y-2">
            <span className="text-sm font-bold">پرداخت‌کننده</span>
            <Select name="paidByPersonId" defaultValue={expense?.paidByPersonId ?? currentPersonId}>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold">تاریخ (شمسی)</span>
            <JalaliDatePicker
              name="date"
              defaultValue={expense ? toInputDate(expense.date) : toInputDate(new Date())}
              required
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold">شماره کارت</span>
            <Input name="cardNumber" defaultValue={expense?.cardNumber ?? ""} placeholder="اختیاری" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold">یادداشت پرداخت</span>
            <Input name="paymentNote" defaultValue={expense?.paymentNote ?? ""} placeholder="مثلا کارت در گروه پین شده" />
          </label>
        </div>
        <label className="space-y-2">
          <span className="text-sm font-bold">توضیحات</span>
          <Textarea name="description" defaultValue={expense?.description ?? ""} placeholder="اختیاری و کوتاه" />
        </label>
      </Card>
      <div className="space-y-5">
        <Card className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-black">افراد این خرج</h2>
            {!lockParticipantList ? (
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setSelected(allPeople.map((p) => p.id))}>
                  همه
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setSelected([])}>
                  پاک
                </Button>
              </div>
            ) : null}
          </div>
          {lockParticipantList ? (
            <div className="space-y-2">
              {expense?.participants.map((participant) => {
                const person = allPeople.find((item) => item.id === participant.personId);
                return (
                  <div key={participant.id} className="rounded-xl border border-slate-100 p-3 text-sm">
                    <p className="font-bold">{person?.name ?? "عضو"}</p>
                    <p className="text-slate-500">
                      {participant.shareAmount == null ? "سهم ثبت نشده" : formatToman(participant.shareAmount)}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute right-3 top-3 size-4 text-slate-400" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} className="pr-10" placeholder="جستجوی عضو" />
              </div>
              <div className="max-h-80 space-y-2 overflow-auto pr-1">
                {filtered.map((person) => (
                  <label key={person.id} className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-100 p-3 hover:bg-emerald-50">
                    <span>
                      <span className="block text-sm font-bold">{person.name}</span>
                      <span className="text-xs text-slate-500">
                        {person.type === "GUEST" ? "مهمان این خرج" : "عضو ثابت"}
                        {person.username && person.type === "MEMBER" ? `، ${person.username}` : ""}
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      name="participantIds"
                      value={person.id}
                      checked={selected.includes(person.id)}
                      onChange={() => toggle(person.id)}
                      className="size-5 accent-emerald-600"
                    />
                  </label>
                ))}
              </div>
              <Button type="button" variant="secondary" className="w-full" onClick={() => setGuestModalOpen(true)}>
                <Plus className="size-4" />
                افزودن مهمان به این خرج
              </Button>
            </>
          )}
        </Card>
        <Card className={`space-y-3 ${isCustom ? "bg-sky-700" : "bg-emerald-700"} text-white`}>
          <h2 className="font-black">{isCustom ? "خرج سفارشی" : "حساب سرانگشتی"}</h2>
          {isCustom ? (
            <p className="text-sm leading-6">
              بعد از ثبت، هر عضو سهم خودش را وارد می‌کند. ادمین گروه برای مهمان‌ها و بقیه سهم تعیین می‌کند. جمع سهم‌ها مبلغ نهایی خرج می‌شود.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <span>تعداد نفرات</span>
              <b className="text-left">{new Intl.NumberFormat("fa-IR").format(selected.length)}</b>
              <span>سهم هر بدهکار</span>
              <b className="text-left">{formatToman(debtShare)}</b>
              <span>سهم پرداخت‌کننده</span>
              <b className="text-left">{formatToman(payerShare)}</b>
              <span>دریافتی از بقیه</span>
              <b className="text-left">{formatToman(receivable)}</b>
            </div>
          )}
          <Button className="w-full bg-white text-emerald-800 hover:bg-emerald-50">
            {expense ? "ذخیره تغییرات" : isCustom ? "ثبت خرج سفارشی" : "ثبت خرج جدید"}
          </Button>
          {expense ? (
            <Button type="submit" form="delete-expense" variant="danger" className="w-full">
              <Trash2 className="size-4" />
              حذف خرج
            </Button>
          ) : null}
        </Card>
      </div>
      {guestModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-xl font-black">افزودن مهمان</h2>
            <p className="mt-2 text-sm text-slate-600">مهمان فقط برای همین خرج ثبت می‌شود و عضو ثابت گروه نمی‌شود.</p>
            <label className="mt-4 block space-y-2">
              <span className="text-sm font-bold">نام مهمان</span>
              <Input value={guestName} onChange={(event) => setGuestName(event.target.value)} placeholder="نام مهمان" autoFocus />
            </label>
            <div className="mt-5 flex gap-2">
              <Button type="button" onClick={addLocalGuest}>
                افزودن
              </Button>
              <Button type="button" variant="outline" onClick={() => setGuestModalOpen(false)}>
                انصراف
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}
