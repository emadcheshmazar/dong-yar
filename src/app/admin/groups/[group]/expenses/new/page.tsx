import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { ExpenseForm } from "@/components/expense-form";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { getActivePeople, getGroupBySlug } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminNewExpensePage({ params }: { params: Promise<{ group: string }> }) {
  await requireAdmin();
  const { group: groupSlug } = await params;
  const group = await getGroupBySlug(groupSlug, true);
  if (!group) notFound();
  const people = await getActivePeople(group.id);
  const firstMember = people.find((person) => person.type === "MEMBER");

  return (
    <main className="min-h-screen bg-[#f8faf2] px-4 py-6 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <Link href={`/admin/groups/${group.slug}`} className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-700">
          <ArrowRight className="size-4" />
          برگشت به مدیریت گروه
        </Link>
        <div className="mb-6">
          <h1 className="text-3xl font-black">ایجاد خرج برای {group.name}</h1>
          <p className="mt-1 text-sm text-slate-600">خرج فقط داخل همین گروه ذخیره می‌شود.</p>
        </div>
        {firstMember ? (
          <ExpenseForm groupSlug={group.slug} people={people} currentPersonId={firstMember.id} adminMode />
        ) : (
          <Card className="text-sm font-bold text-slate-600">برای ایجاد خرج، اول حداقل یک عضو ثابت برای این گروه بساز.</Card>
        )}
      </div>
    </main>
  );
}
