"use client";

import { useActionState } from "react";
import { Search } from "lucide-react";
import { selectGroupAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function GroupLookupForm() {
  const [state, action, pending] = useActionState(selectGroupAction, null);
  return (
    <form action={action} className="space-y-4">
      <label className="block space-y-2">
        <span className="text-sm font-bold text-slate-700">نام گروه</span>
        <div className="relative">
          <Search className="absolute right-3 top-3 size-4 text-slate-400" />
          <Input name="groupSlug" className="pr-10 text-left" dir="ltr" placeholder="marketing" required />
        </div>
      </label>
      {state?.error ? <p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{state.error}</p> : null}
      <Button className="w-full" size="lg" disabled={pending}>
        {pending ? "در حال بررسی..." : "ادامه"}
      </Button>
    </form>
  );
}
