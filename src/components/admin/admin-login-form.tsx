"use client";

import { useActionState, useEffect } from "react";
import { ShieldCheck } from "lucide-react";
import { adminLoginAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { useToast } from "@/components/ui/toast";

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminLoginAction, null);
  const { showToast } = useToast();

  useEffect(() => {
    if (state?.toast) showToast(state.toast);
  }, [showToast, state]);

  return (
    <form action={action} className="space-y-4">
      <label className="block space-y-2">
        <span className="text-sm font-bold text-slate-700">رمز ادمین</span>
        <div className="relative">
          <ShieldCheck className="absolute right-3 top-3 size-4 text-slate-400" />
          <PasswordInput name="password" className="pr-10" placeholder="رمز ادمین" required />
        </div>
      </label>
      {state?.error ? <p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{state.error}</p> : null}
      <Button className="w-full" size="lg" disabled={pending}>
        {pending ? "در حال ورود..." : "ورود به پنل ادمین"}
      </Button>
    </form>
  );
}
