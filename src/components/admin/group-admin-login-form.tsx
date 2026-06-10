"use client";

import { useActionState } from "react";
import { ShieldCheck, UserRound } from "lucide-react";
import { groupAdminLoginAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function GroupAdminLoginForm({ groupSlug }: { groupSlug: string }) {
  const [state, action, pending] = useActionState(groupAdminLoginAction, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="groupSlug" value={groupSlug} />
      <label className="block space-y-2">
        <span className="text-sm font-bold text-slate-700">نام کاربری ادمین</span>
        <div className="relative">
          <UserRound className="absolute right-3 top-3 size-4 text-slate-400" />
          <Input name="username" dir="ltr" className="pr-10 text-left" placeholder="admin" required />
        </div>
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-bold text-slate-700">رمز ادمین گروه</span>
        <div className="relative">
          <ShieldCheck className="absolute right-3 top-3 size-4 text-slate-400" />
          <Input name="password" type="password" className="pr-10" placeholder="رمز" required />
        </div>
      </label>
      {state?.error ? <p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{state.error}</p> : null}
      <Button className="w-full" size="lg" disabled={pending}>
        {pending ? "در حال ورود..." : "ورود به ادمین گروه"}
      </Button>
    </form>
  );
}
