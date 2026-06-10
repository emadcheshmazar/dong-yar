import { notFound, redirect } from "next/navigation";
import { Coins, HandHeart } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { Card } from "@/components/ui/card";
import { getCurrentPerson } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getGroupBySlug } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function LoginPage({ params }: { params: Promise<{ group: string }> }) {
  const { group: groupSlug } = await params;
  const group = await getGroupBySlug(groupSlug);
  if (!group) notFound();
  const current = await getCurrentPerson(group.slug);
  if (current) redirect(`/${group.slug}/dashboard`);
  const members = await prisma.person.findMany({
    where: { groupId: group.id, type: "MEMBER", isActive: true },
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
          <p className="mt-2 text-sm text-slate-600">ورود گروه {group.name}</p>
        </div>
        <Card className="space-y-5">
          <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
            <HandHeart className="mb-2 size-5" />
            عضو ثابتت را انتخاب کن و با رمز ورود وارد شو. مهمان‌ها فقط داخل خرج‌ها هستند.
          </div>
          <LoginForm groupSlug={group.slug} usernames={members.map((member) => member.username).filter(Boolean) as string[]} />
        </Card>
      </div>
    </main>
  );
}
