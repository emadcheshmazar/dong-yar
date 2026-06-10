"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { FLASH_TOAST_COOKIE } from "@/lib/toast-types";
import type { ToastMessage, ToastType } from "@/lib/toast-types";
import { cn } from "@/lib/utils";

type ToastInput = {
  type: ToastType;
  message: string;
};

type ToastContextValue = {
  showToast: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function clearFlashCookie() {
  document.cookie = `${FLASH_TOAST_COOKIE}=; Max-Age=0; path=/; SameSite=Lax`;
}

export function ToastProvider({
  children,
  initialToast,
}: {
  children: React.ReactNode;
  initialToast: ToastMessage | null;
}) {
  const [toasts, setToasts] = useState<ToastMessage[]>(() => (initialToast ? [initialToast] : []));

  const dismiss = useCallback((id: string) => {
    setToasts((items) => items.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((toast: ToastInput) => {
    const id = crypto.randomUUID();
    setToasts((items) => [...items, { ...toast, id }]);
    window.setTimeout(() => dismiss(id), 4200);
  }, [dismiss]);

  useEffect(() => {
    if (!initialToast) return;
    clearFlashCookie();
    const timer = window.setTimeout(() => dismiss(initialToast.id), 4200);
    return () => window.clearTimeout(timer);
  }, [dismiss, initialToast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 left-4 z-[100] grid w-[min(420px,calc(100vw-2rem))] gap-2" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = toast.type === "success" ? CheckCircle2 : XCircle;
          return (
            <button
              key={toast.id}
              type="button"
              onClick={() => dismiss(toast.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-right text-sm font-bold shadow-lg",
                toast.type === "success" ? "border-emerald-200 text-emerald-950" : "border-rose-200 text-rose-950",
              )}
            >
              <Icon className={cn("size-5 shrink-0", toast.type === "success" ? "text-emerald-600" : "text-rose-600")} />
              <span>{toast.message}</span>
            </button>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
