import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutDashboard, LogOut, PlusCircle, ReceiptText, UsersRound } from "lucide-react";
import { destroySession, requirePerson } from "@/lib/auth";

const navItems = [
  { href: "/dashboard", label: "داشبورد من", icon: LayoutDashboard },
  { href: "/expenses", label: "همه خرج‌ها", icon: ReceiptText },
  { href: "/expenses/new", label: "ثبت خرج", icon: PlusCircle },
  { href: "/people", label: "افراد", icon: UsersRound },
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const person = await requirePerson();
  async function logout() {
    "use server";
    await destroySession();
    redirect("/login");
  }
  return (
    <div className="min-h-screen bg-[#f8faf2] text-slate-900">
      <header className="sticky top-0 z-20 border-b border-emerald-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-emerald-600 text-xl font-black text-white">د</span>
            <span>
              <span className="block text-lg font-black">داریا دنگ</span>
              <span className="text-xs text-slate-500">سلام {person.name}، حساب‌ها دوستانه جلو می‌رن.</span>
            </span>
          </Link>
          <nav className="flex flex-wrap items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
            <form action={logout}>
              <button className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-700">
                <LogOut className="size-4" />
                خروج
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
