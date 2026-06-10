"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function PasswordInput({
  className,
  buttonClassName,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { buttonClassName?: string }) {
  const [visible, setVisible] = React.useState(false);
  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("pl-10", className)}
      />
      <button
        type="button"
        aria-label={visible ? "پنهان کردن رمز" : "نمایش رمز"}
        onClick={() => setVisible((value) => !value)}
        className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700",
          buttonClassName,
        )}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
