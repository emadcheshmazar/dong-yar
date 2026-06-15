import { redirect } from "next/navigation";
import { Coins } from "lucide-react";
import { UserAuthForm } from "@/components/user-auth-form";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ signup?: string; invite?: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (currentUser) redirect("/account");
  const { signup, invite } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-[#f8faf2] px-4 py-10 text-slate-900">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-3xl bg-emerald-600 text-white shadow-lg">
            <Coins className="size-8" />
          </div>
          <h1 className="text-3xl font-black">دنگ یار</h1>
          <p className="mt-2 text-sm text-slate-600">ورود کاربران یا ثبت‌نام با ایمیل</p>
        </div>
        <Card>
          <UserAuthForm initialMode={signup ? "signup" : "login"} initialInviteCode={invite ?? ""} />
        </Card>
      </div>
    </main>
  );
}
