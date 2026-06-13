"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function CopyableText({
  value,
  label,
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      showToast({ type: "success", message: "کپی شد." });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast({ type: "error", message: "کپی نشد." });
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 transition hover:bg-emerald-50",
        className,
      )}
      title="کلیک برای کپی"
    >
      {label ? <span className="shrink-0 text-slate-600">{label}</span> : null}
      <span className="truncate" dir="ltr">
        {value}
      </span>
      {copied ? <Check className="size-4 shrink-0 text-emerald-600" /> : <Copy className="size-4 shrink-0 text-emerald-700" />}
    </button>
  );
}
