import { notFound, redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { GroupAdminLoginForm } from "@/components/admin/group-admin-login-form";
import { Card } from "@/components/ui/card";
import { getCurrentGroupAdmin } from "@/lib/auth";
import { getGroupBySlug } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function GroupAdminLoginPage({ params }: { params: Promise<{ group: string }> }) {
  const { group: groupSlug } = await params;
  const group = await getGroupBySlug(groupSlug);
  if (!group) notFound();
  const admin = await getCurrentGroupAdmin(group.slug);
  if (admin) redirect(`/${group.slug}/admin`);
  return (
    <main className="grid min-h-screen place-items-center bg-[#f8faf2] px-4 py-10 text-slate-900">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-3xl bg-emerald-600 text-white shadow-lg">
            <ShieldCheck className="size-8" />
          </div>
          <h1 className="text-3xl font-black">ادمین {group.name}</h1>
          <p className="mt-2 text-sm text-slate-600">مدیریت کاربران و خرج‌های همین گروه</p>
        </div>
        <Card>
          <GroupAdminLoginForm groupSlug={group.slug} />
        </Card>
      </div>
    </main>
  );
}
