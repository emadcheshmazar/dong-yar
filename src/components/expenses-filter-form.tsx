"use client";

import { Search } from "lucide-react";
import { JalaliDatePicker } from "@/components/jalali-date-picker";
import { Input, Select } from "@/components/ui/input";

type Member = { id: string; name: string };

export function ExpensesFilterForm({
  query,
  from,
  to,
  payer,
  status,
  members,
}: {
  query: string;
  from: string;
  to: string;
  payer: string;
  status: string;
  members: Member[];
}) {
  return (
    <form className="grid gap-3 md:grid-cols-5">
      <div className="relative md:col-span-2">
        <Search className="absolute right-3 top-3 size-4 text-slate-400" />
        <Input name="q" defaultValue={query} className="pr-10" placeholder="جستجو در عنوان یا پرداخت‌کننده" />
      </div>
      <div className="space-y-1">
        <span className="text-xs font-bold text-slate-500">از تاریخ</span>
        <JalaliDatePicker name="from" defaultValue={from} optional />
      </div>
      <div className="space-y-1">
        <span className="text-xs font-bold text-slate-500">تا تاریخ</span>
        <JalaliDatePicker name="to" defaultValue={to} optional />
      </div>
      <Select name="payer" defaultValue={payer}>
        <option value="">همه پرداخت‌کننده‌ها</option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </Select>
      <Select name="status" defaultValue={status}>
        <option value="all">همه وضعیت‌ها</option>
        <option value="open">باز</option>
        <option value="paid">تسویه شده</option>
      </Select>
      <button className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white md:col-span-5">اعمال فیلتر</button>
    </form>
  );
}
