"use client";

import Link from "next/link";
import { useState } from "react";
import { LayoutDashboard, LogOut, Menu, PlusCircle, ReceiptText, UserCircle, UsersRound, X } from "lucide-react";
import { logoutAllAction } from "@/app/actions";

const navItems = [
  { href: "/dashboard", label: "داشبورد من", icon: LayoutDashboard },
  { href: "/expenses", label: "همه خرج‌ها", icon: ReceiptText },
  { href: "/expenses/new", label: "ثبت خرج", icon: PlusCircle },
  { href: "/people", label: "افراد", icon: UsersRound },
];

export function AppShellNav({
  prefix,
  personName,
  groupName,
}: {
  prefix: string;
  personName: string;
  groupName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-emerald-100 bg-white/90 backdrop-blur">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
        <Link href={`${prefix}/dashboard`} className="flex min-w-0 items-center gap-3" onClick={() => setOpen(false)}>
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-xl font-black text-white">د</span>
          <span className="min-w-0">
            <span className="block truncate text-lg font-black">دنگ یار</span>
            <span className="block truncate text-xs text-slate-500">
              سلام {personName}، گروه {groupName}
            </span>
          </span>
        </Link>
        <button
          type="button"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-700 hover:bg-emerald-50 md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? "بستن منو" : "باز کردن منو"}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
        <nav className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={`${prefix}${item.href}`}
              className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
          <Link
            href="/account"
            className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
          >
            <UserCircle className="size-4" />
            حساب من
          </Link>
          <form action={logoutAllAction}>
            <button className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-700">
              <LogOut className="size-4" />
              خروج
            </button>
          </form>
        </nav>
      </div>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 top-[73px] z-10 bg-slate-950/30 md:hidden"
            aria-label="بستن منو"
            onClick={() => setOpen(false)}
          />
          <nav className="absolute inset-x-0 top-full z-20 border-b border-emerald-100 bg-white p-4 shadow-lg md:hidden">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={`${prefix}${item.href}`}
                  className="inline-flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                  onClick={() => setOpen(false)}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              ))}
              <Link
                href="/account"
                className="inline-flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                onClick={() => setOpen(false)}
              >
                <UserCircle className="size-4" />
                حساب من
              </Link>
              <form action={logoutAllAction}>
                <button className="inline-flex h-11 w-full items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-700">
                  <LogOut className="size-4" />
                  خروج
                </button>
              </form>
            </div>
          </nav>
        </>
      ) : null}
    </header>
  );
}
