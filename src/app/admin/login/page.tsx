import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { Card } from "@/components/ui/card";
import { getCurrentAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const admin = await getCurrentAdmin();
  if (admin) redirect("/admin");
  return (
    <main className="grid min-h-screen place-items-center bg-[#f8faf2] px-4 py-10 text-slate-900">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-3xl bg-slate-900 text-white shadow-lg">
            <ShieldCheck className="size-8" />
          </div>
          <h1 className="text-3xl font-black">پنل ادمین</h1>
          <p className="mt-2 text-sm text-slate-600">مدیریت گروه‌ها، کاربران و خرج‌ها</p>
        </div>
        <Card>
          <AdminLoginForm />
        </Card>
      </div>
    </main>
  );
}
