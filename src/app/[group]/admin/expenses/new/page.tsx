import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ExpenseForm } from "@/components/expense-form";
import { Card } from "@/components/ui/card";
import { requireGroupAdmin } from "@/lib/auth";
import { getActivePeople } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function GroupAdminNewExpensePage({ params }: { params: Promise<{ group: string }> }) {
  const { group } = await params;
  const admin = await requireGroupAdmin(group);
  const people = await getActivePeople(admin.groupId);
  const firstMember = people.find((person) => person.type === "MEMBER");

  return (
    <main className="min-h-screen bg-[#f8faf2] px-4 py-6 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <Link href={`/${admin.group.slug}/admin`} className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-700">
          <ArrowRight className="size-4" />
          برگشت به پنل گروه
        </Link>
        <div className="mb-6">
          <h1 className="text-3xl font-black">ایجاد خرج برای {admin.group.name}</h1>
          <p className="mt-1 text-sm text-slate-600">خرج فقط داخل همین گروه ذخیره می‌شود.</p>
        </div>
        {firstMember ? (
          <ExpenseForm groupSlug={admin.group.slug} people={people} currentPersonId={firstMember.id} adminMode managerScope="group" />
        ) : (
          <Card className="text-sm font-bold text-slate-600">برای ایجاد خرج، اول حداقل یک عضو ثابت برای این گروه بساز.</Card>
        )}
      </div>
    </main>
  );
}
