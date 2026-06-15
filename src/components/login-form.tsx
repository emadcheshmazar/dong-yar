"use client";

import { useActionState, useEffect } from "react";
import { KeyRound, UserRound } from "lucide-react";
import { loginAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { useToast } from "@/components/ui/toast";

export function LoginForm({ groupSlug, usernames }: { groupSlug: string; usernames: string[] }) {
  const [state, action, pending] = useActionState(loginAction, null);
  const { showToast } = useToast();

  useEffect(() => {
    if (state?.toast) showToast(state.toast);
  }, [showToast, state]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="groupSlug" value={groupSlug} />
      <label className="block space-y-2">
        <span className="text-sm font-bold text-slate-700">نام کاربری</span>
        <div className="relative">
          <UserRound className="absolute right-3 top-3 size-4 text-slate-400" />
          <Input name="username" list="members" className="pr-10" placeholder="مثلا emad" required />
          <datalist id="members">
            {usernames.map((username) => (
              <option key={username} value={username} />
            ))}
          </datalist>
        </div>
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-bold text-slate-700">رمز ورود</span>
        <div className="relative">
          <KeyRound className="absolute right-3 top-3 size-4 text-slate-400" />
          <PasswordInput name="password" className="pr-10" placeholder="رمز ورود" required />
        </div>
      </label>
      {state?.error ? <p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{state.error}</p> : null}
      <Button className="w-full" size="lg" disabled={pending}>
        {pending ? "داریم وارد می‌شیم..." : "ورود به دنگ یار"}
      </Button>
    </form>
  );
}
