"use client";

import { useMemo, useState } from "react";
import { Person, Expense, ExpenseParticipant } from "@prisma/client";
import { Plus, Search, Trash2 } from "lucide-react";
import { createExpenseAction, editExpenseAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { calculateShare, formatToman, toInputDate } from "@/lib/utils";

type PersonOption = Pick<Person, "id" | "name" | "type">;
type ExpenseForEdit = Expense & { participants: ExpenseParticipant[] };

export function ExpenseForm({
  groupSlug,
  people,
  currentPersonId,
  expense,
  adminMode = false,
  managerScope = "central",
}: {
  groupSlug: string;
  people: PersonOption[];
  currentPersonId: string;
  expense?: ExpenseForEdit;
  adminMode?: boolean;
  managerScope?: "central" | "group";
}) {
  const [amount, setAmount] = useState(expense?.amount ?? 0);
  const [selected, setSelected] = useState<string[]>(expense?.participants.map((p) => p.personId) ?? [currentPersonId]);
  const [query, setQuery] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [localGuests, setLocalGuests] = useState<PersonOption[]>([]);
  const allPeople = [...people, ...localGuests];
  const filtered = allPeople.filter((person) => person.name.includes(query) || person.id.includes(query));
  const share = useMemo(() => calculateShare(amount, selected.length), [amount, selected.length]);
  const receivable = Math.max(selected.length - 1, 0) * share;
  const action = expense ? editExpenseAction : createExpenseAction;

  function toggle(id: string) {
    setSelected((items) => (items.includes(id) ? items.filter((item) => item !== id) : [...items, id]));
  }

  function addLocalGuest() {
    if (!guestName.trim()) return;
    const id = `guest:${crypto.randomUUID()}`;
    setLocalGuests((items) => [...items, { id, name: guestName.trim(), type: "GUEST" } as PersonOption]);
    setSelected((items) => [...items, id]);
    setGuestName("");
    setGuestModalOpen(false);
  }

  return (
    <form action={action} className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <input type="hidden" name="groupSlug" value={groupSlug} />
      {adminMode ? <input type="hidden" name="adminMode" value="on" /> : null}
      {adminMode ? <input type="hidden" name="managerScope" value={managerScope} /> : null}
      {expense ? <input type="hidden" name="id" value={expense.id} /> : null}
      {localGuests.map((guest) => (
        <input key={guest.id} type="hidden" name="localGuests" value={`${guest.id}|||${guest.name}`} />
      ))}
      <Card className="space-y-5">
        {expense ? (
          <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800">
            ویرایش خرج ممکن است وضعیت بدهی‌ها را تغییر دهد.
          </p>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-bold">عنوان خرج</span>
            <Input name="title" defaultValue={expense?.title} placeholder="مثلا صبحانه شنبه" required />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold">مبلغ کل</span>
            <Input
              name="amount"
              type="number"
              min={1}
              defaultValue={expense?.amount}
              onChange={(event) => setAmount(Number(event.target.value))}
              placeholder="850000"
              required
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold">پرداخت‌کننده</span>
            <Select name="paidByPersonId" defaultValue={expense?.paidByPersonId ?? currentPersonId}>
              {people
                .filter((p) => p.type === "MEMBER")
                .map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
            </Select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold">تاریخ</span>
            <Input name="date" type="date" defaultValue={expense ? toInputDate(expense.date) : toInputDate(new Date())} required />
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
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-black">افراد این خرج</h2>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setSelected(allPeople.map((p) => p.id))}>
                همه
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setSelected([])}>
                پاک
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute right-3 top-3 size-4 text-slate-400" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} className="pr-10" placeholder="جستجوی عضو یا مهمان" />
          </div>
          <div className="max-h-80 space-y-2 overflow-auto pr-1">
            {filtered.map((person) => (
              <label key={person.id} className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-100 p-3 hover:bg-emerald-50">
                <span>
                  <span className="block text-sm font-bold">{person.name}</span>
                  <span className="text-xs text-slate-500">{person.type === "GUEST" ? "مهمان" : "عضو ثابت"}</span>
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
            افزودن مهمان
          </Button>
        </Card>
        <Card className="space-y-3 bg-emerald-700 text-white">
          <h2 className="font-black">حساب سرانگشتی</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <span>تعداد نفرات</span>
            <b className="text-left">{new Intl.NumberFormat("fa-IR").format(selected.length)}</b>
            <span>سهم هر نفر</span>
            <b className="text-left">{formatToman(share)}</b>
            <span>دریافتی از بقیه</span>
            <b className="text-left">{formatToman(receivable)}</b>
          </div>
          <Button className="w-full bg-white text-emerald-800 hover:bg-emerald-50">
            {expense ? "ذخیره تغییرات" : "ثبت خرج جدید"}
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
            <p className="mt-2 text-sm text-slate-600">مهمان پنل ندارد، فقط برای حساب‌وکتاب همین خرج اضافه می‌شود.</p>
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
