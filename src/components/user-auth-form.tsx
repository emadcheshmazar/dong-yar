"use client";

import { useActionState, useEffect, useState } from "react";
import { KeyRound, Mail, ShieldCheck, UserRound } from "lucide-react";
import { sendEmailCodeAction, signupUserAction, userLoginAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { useToast } from "@/components/ui/toast";

type AuthMode = "login" | "signup";

export function UserAuthForm({
  initialMode = "login",
  initialInviteCode = "",
}: {
  initialMode?: AuthMode;
  initialInviteCode?: string;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [loginState, loginAction, loginPending] = useActionState(userLoginAction, null);
  const [codeState, codeAction, codePending] = useActionState(sendEmailCodeAction, null);
  const [signupState, signupAction, signupPending] = useActionState(signupUserAction, null);
  const [email, setEmail] = useState("");
  const isCodeStep = mode === "signup" && Boolean(codeState && "success" in codeState && codeState.success);
  const { showToast } = useToast();

  useEffect(() => {
    if (loginState?.toast) showToast(loginState.toast);
  }, [loginState, showToast]);

  useEffect(() => {
    if (codeState?.toast) showToast(codeState.toast);
  }, [codeState, showToast]);

  useEffect(() => {
    if (signupState?.toast) showToast(signupState.toast);
  }, [signupState, showToast]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
        <button
          type="button"
          className={`rounded-xl px-3 py-2 text-sm font-bold transition ${mode === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
          onClick={() => setMode("login")}
        >
          ورود
        </button>
        <button
          type="button"
          className={`rounded-xl px-3 py-2 text-sm font-bold transition ${mode === "signup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
          onClick={() => setMode("signup")}
        >
          ثبت‌نام
        </button>
      </div>

      {mode === "login" ? (
        <form action={loginAction} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-700">ایمیل</span>
            <div className="relative">
              <Mail className="absolute right-3 top-3 size-4 text-slate-400" />
              <Input
                name="email"
                type="email"
                dir="ltr"
                className="pr-10 text-left"
                placeholder="you@example.com"
                required
              />
            </div>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-700">رمز ورود</span>
            <div className="relative">
              <KeyRound className="absolute right-3 top-3 size-4 text-slate-400" />
              <PasswordInput name="password" className="pr-10" placeholder="رمز ورود" required />
            </div>
          </label>
          {loginState?.error ? <p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{loginState.error}</p> : null}
          <Button className="w-full" size="lg" disabled={loginPending}>
            {loginPending ? "در حال ورود..." : "ورود"}
          </Button>
        </form>
      ) : !isCodeStep ? (
        <form action={codeAction} className="space-y-4">
          <input type="hidden" name="purpose" value="USER_SIGNUP" />
          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-700">ایمیل</span>
            <div className="relative">
              <Mail className="absolute right-3 top-3 size-4 text-slate-400" />
              <Input
                name="email"
                type="email"
                dir="ltr"
                className="pr-10 text-left"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
          </label>
          {codeState && "error" in codeState ? <p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{codeState.error}</p> : null}
          <Button className="w-full" size="lg" disabled={codePending}>
            {codePending ? "در حال ارسال..." : "ارسال کد تایید"}
          </Button>
        </form>
      ) : (
        <form action={signupAction} className="space-y-4">
          <input type="hidden" name="email" value={email} />
          <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-900">
            کد تایید به <span dir="ltr">{email}</span> ارسال شد.
            {codeState && "devCode" in codeState && codeState.devCode ? <span className="mt-2 block">کد توسعه: {codeState.devCode}</span> : null}
          </div>
          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-700">کد ۶ رقمی</span>
            <div className="relative">
              <ShieldCheck className="absolute right-3 top-3 size-4 text-slate-400" />
              <Input name="code" inputMode="numeric" dir="ltr" className="pr-10 text-left" placeholder="123456" required />
            </div>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-700">نام</span>
            <div className="relative">
              <UserRound className="absolute right-3 top-3 size-4 text-slate-400" />
              <Input name="name" className="pr-10" placeholder="نام کامل" required />
            </div>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-700">رمز ورود</span>
            <div className="relative">
              <KeyRound className="absolute right-3 top-3 size-4 text-slate-400" />
              <PasswordInput name="password" className="pr-10" placeholder="حداقل ۶ کاراکتر" required />
            </div>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-700">کد دعوت گروه (اختیاری)</span>
            <Input name="joinCode" dir="ltr" className="text-left uppercase" placeholder="A1B2C3D4E5" defaultValue={initialInviteCode} />
          </label>
          {signupState?.error ? <p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{signupState.error}</p> : null}
          <Button className="w-full" size="lg" disabled={signupPending}>
            {signupPending ? "در حال ثبت‌نام..." : "تکمیل ثبت‌نام"}
          </Button>
        </form>
      )}
    </div>
  );
}
