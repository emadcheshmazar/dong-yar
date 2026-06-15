import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Trash2, UserPlus, UsersRound } from "lucide-react";
import {
  deleteGroupAction,
  deletePersonAction,
  upsertGroupAction,
  upsertPersonAction,
} from "@/app/actions";
import { MembershipAdminCard } from "@/components/admin/membership-admin-card";
import { Badge } from "@/components/badge";
import { CopyableText } from "@/components/copyable-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/lib/auth";
import { getAdminGroup } from "@/lib/queries";
import { formatDate, formatToman } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminGroupPage({ params }: { params: Promise<{ group: string }> }) {
  await requireAdmin();
  const { group: groupSlug } = await params;
  const group = await getAdminGroup(groupSlug);
  if (!group) notFound();
  const members = group.people.filter((person) => person.type === "MEMBER");

  return (
    <main className="min-h-screen bg-[#f8faf2] text-slate-900">
      <header className="border-b border-slate-200 bg-white/90">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href="/admin" className="mb-2 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-700">
              <ArrowRight className="size-4" />
              برگشت به گروه‌ها
            </Link>
            <h1 className="text-2xl font-black">مدیریت {group.name}</h1>
            <p className="text-sm text-slate-600" dir="ltr">/{group.slug}</p>
          </div>
          <Link className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-bold text-white" href="/account">
            حساب کاربری
          </Link>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6">
        <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <Card>
            <h2 className="mb-4 text-xl font-black">تنظیمات گروه</h2>
            <form action={upsertGroupAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto]">
              <input type="hidden" name="id" value={group.id} />
              <Input name="name" defaultValue={group.name} required />
              <Input name="slug" dir="ltr" className="text-left" defaultValue={group.slug} required />
              <label className="flex items-center gap-2 text-sm font-bold">
                <input name="isActive" type="checkbox" defaultChecked={group.isActive} className="size-5 accent-emerald-600" />
                فعال
              </label>
              <Button>ذخیره</Button>
            </form>
          </Card>
          <Card className="bg-rose-50">
            <h2 className="mb-3 text-xl font-black text-rose-950">حذف گروه</h2>
            <p className="mb-4 text-sm text-rose-800">حذف گروه همه کاربران و خرج‌های همان گروه را حذف می‌کند.</p>
            <form action={deleteGroupAction}>
              <input type="hidden" name="id" value={group.id} />
              <Button variant="danger" className="w-full">
                <Trash2 className="size-4" />
                حذف کامل گروه
              </Button>
            </form>
          </Card>
        </section>

        <MembershipAdminCard group={group} />

        <section className="grid gap-5">
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <UsersRound className="size-5 text-emerald-600" />
              <h2 className="text-xl font-black">کاربران ثابت</h2>
            </div>
            <form action={upsertPersonAction} className="mb-5 grid gap-3 rounded-2xl bg-emerald-50 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
              <input type="hidden" name="groupId" value={group.id} />
              <input type="hidden" name="groupSlug" value={group.slug} />
              <input type="hidden" name="type" value="MEMBER" />
              <Input name="name" placeholder="نام" required />
              <Input name="username" placeholder="نام کاربری یکتا در این گروه" required />
              <label className="flex items-center gap-2 text-sm font-bold">
                <input name="isActive" type="checkbox" defaultChecked className="size-5 accent-emerald-600" />
                فعال
              </label>
              <label className="flex items-center gap-2 text-sm font-bold">
                <input name="isGroupAdmin" type="checkbox" className="size-5 accent-emerald-600" />
                ادمین هست
              </label>
              <Button className="sm:col-span-2 lg:col-span-3">
                <UserPlus className="size-4" />
                افزودن عضو
              </Button>
            </form>
            <div className="space-y-3">
              {members.map((member) => (
                <form key={member.id} action={upsertPersonAction} className="grid gap-3 rounded-2xl border border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto_auto]">
                  <input type="hidden" name="id" value={member.id} />
                  <input type="hidden" name="groupId" value={group.id} />
                  <input type="hidden" name="groupSlug" value={group.slug} />
                  <input type="hidden" name="type" value="MEMBER" />
                  <Input name="name" defaultValue={member.name} />
                  <Input name="username" defaultValue={member.username ?? ""} />
                  <label className="flex items-center gap-2 text-sm font-bold">
                    <input name="isActive" type="checkbox" defaultChecked={member.isActive} className="size-5 accent-emerald-600" />
                    فعال
                  </label>
                  <label className="flex items-center gap-2 text-sm font-bold">
                    <input name="isGroupAdmin" type="checkbox" defaultChecked={member.isGroupAdmin} className="size-5 accent-emerald-600" />
                    ادمین هست
                  </label>
                  <Button variant="outline">ذخیره</Button>
                  <Button form={`delete-person-${member.id}`} variant="danger" type="submit">حذف</Button>
                </form>
              ))}
              {members.map((member) => (
                <form key={`delete-${member.id}`} id={`delete-person-${member.id}`} action={deletePersonAction}>
                  <input type="hidden" name="id" value={member.id} />
                  <input type="hidden" name="groupSlug" value={group.slug} />
                </form>
              ))}
              {!members.length ? <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600">هنوز عضو ثابتی ساخته نشده.</p> : null}
            </div>
          </Card>
        </section>

        <Card>
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black">گزارش خرج‌های گروه</h2>
              <p className="mt-1 text-sm text-slate-600">ادمین اصلی فقط گزارش خرج‌های این گروه را می‌بیند.</p>
            </div>
          </div>
          <div className="space-y-3">
            {group.expenses.map((expense) => {
              const unpaid = expense.participants.filter((p) => p.personId !== expense.paidByPersonId && p.paymentStatus === "UNPAID");
              return (
                <div key={expense.id} className="rounded-2xl border border-slate-100 p-4">
                  <p className="font-black">{expense.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatDate(expense.date)} · پرداخت‌کننده: {expense.paidBy.name}
                  </p>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <dt className="text-slate-500">مبلغ</dt>
                      <dd className="mt-1">
                        <CopyableText value={formatToman(expense.amount)} />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">وضعیت</dt>
                      <dd>
                        <Badge tone={unpaid.length ? "amber" : "green"}>
                          {unpaid.length ? `${unpaid.length} نفر باز` : "تسویه"}
                        </Badge>
                      </dd>
                    </div>
                  </dl>
                </div>
              );
            })}
            {!group.expenses.length ? <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm font-bold text-slate-600">هنوز خرجی برای این گروه ثبت نشده.</p> : null}
          </div>
        </Card>
      </div>
    </main>
  );
}
