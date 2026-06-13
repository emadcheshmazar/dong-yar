import Link from "next/link";
import { Home, LogIn, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f8faf2] px-4 py-10 text-slate-900">
      <Card className="w-full max-w-lg text-center">
        <div className="mx-auto mb-5 grid size-20 place-items-center rounded-3xl bg-rose-100 text-rose-700">
          <SearchX className="size-10" />
        </div>
        <p className="text-sm font-bold text-slate-500">خطای ۴۰۴</p>
        <h1 className="mt-2 text-3xl font-black">صفحه پیدا نشد</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          این آدرس وجود ندارد یا خرج/گروهی که دنبالش بودی حذف شده. آدرس را دوباره چک کن یا از منوی اصلی برگرد.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/">
            <Button className="w-full sm:w-auto">
              <Home className="size-4" />
              صفحه اصلی
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" className="w-full sm:w-auto">
              <LogIn className="size-4" />
              ورود
            </Button>
          </Link>
          <Link href="/account">
            <Button variant="secondary" className="w-full sm:w-auto">
              حساب من
            </Button>
          </Link>
        </div>
      </Card>
    </main>
  );
}
