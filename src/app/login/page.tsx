import { redirect } from "next/navigation";
import { Coins, HandHeart } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { Card } from "@/components/ui/card";
import { getCurrentPerson } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const current = await getCurrentPerson();
  if (current) redirect("/dashboard");
  const members = await prisma.person.findMany({
    where: { type: "MEMBER", isActive: true },
    orderBy: { createdAt: "asc" },
  });
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-3xl bg-emerald-600 text-white shadow-lg">
            <Coins className="size-8" />
          </div>
          <h1 className="text-3xl font-black">داریا دنگ</h1>
          <p className="mt-2 text-sm text-slate-600">خرج‌های کوچیک شرکت، بی‌دردسر و دوستانه.</p>
        </div>
        <Card className="space-y-5">
          <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
            <HandHeart className="mb-2 size-5" />
            عضو ثابتت را انتخاب کن و با رمز ورود وارد شو. مهمان‌ها فقط داخل خرج‌ها هستند.
          </div>
          <LoginForm usernames={members.map((member) => member.username).filter(Boolean) as string[]} />
        </Card>
      </div>
    </main>
  );
}
