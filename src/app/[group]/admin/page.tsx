import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LogOut, Pencil, PlusCircle, UserPlus, UsersRound } from "lucide-react";
import { deleteExpenseAction, deletePersonAction, upsertPersonAction } from "@/app/actions";
import { Badge } from "@/components/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { destroyGroupAdminSession, requireGroupAdmin } from "@/lib/auth";
import { getAdminGroup } from "@/lib/queries";
import { formatDate, formatToman } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function GroupAdminPage({ params }: { params: Promise<{ group: string }> }) {
  const { group: groupSlug } = await params;
  const currentAdmin = await requireGroupAdmin(groupSlug);
  const group = await getAdminGroup(currentAdmin.group.slug);
  if (!group) notFound();
  const members = group.people.filter((person) => person.type === "MEMBER");
  const guests = group.people.filter((person) => person.type === "GUEST");

  async function logout() {
    "use server";
    await destroyGroupAdminSession();
    redirect(`/${groupSlug}/admin/login`);
  }

  return (
    <main className="min-h-screen bg-[#f8faf2] text-slate-900">
      <header className="border-b border-slate-200 bg-white/90">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black">پنل ادمین {group.name}</h1>
            <p className="text-sm text-slate-600">سلام {currentAdmin.name}، فقط همین گروه در اختیار توست.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-bold text-white" href={`/${group.slug}/login`}>
              ورود به فلوی گروه
            </Link>
            <form action={logout}>
              <Button variant="ghost">
                <LogOut className="size-4" />
                خروج
              </Button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6">
        <section className="grid gap-5 lg:grid-cols-2">
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <UsersRound className="size-5 text-emerald-600" />
              <h2 className="text-xl font-black">کاربران ثابت</h2>
            </div>
            <form action={upsertPersonAction} className="mb-5 grid gap-3 rounded-2xl bg-emerald-50 p-4 md:grid-cols-[1fr_1fr_auto]">
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
              <PasswordInput name="password" placeholder="رمز اختیاری؛ خالی یعنی رمز مشترک" />
              <Button className="md:col-span-3">
                <UserPlus className="size-4" />
                افزودن عضو
              </Button>
            </form>
            <div className="space-y-3">
              {members.map((member) => (
                <form key={member.id} action={upsertPersonAction} className="grid gap-3 rounded-2xl border border-slate-100 p-4 md:grid-cols-[1fr_1fr_auto_auto_auto]">
                  <input type="hidden" name="id" value={member.id} />
                  <input type="hidden" name="groupId" value={group.id} />
                  <input type="hidden" name="groupSlug" value={group.slug} />
                  <input type="hidden" name="type" value="MEMBER" />
                  <Input name="name" defaultValue={member.name} />
                  <Input name="username" defaultValue={member.username ?? ""} />
                  <PasswordInput name="password" placeholder="رمز جدید اختیاری" />
                  <label className="flex items-center gap-2 text-sm font-bold">
                    <input name="isActive" type="checkbox" defaultChecked={member.isActive} className="size-5 accent-emerald-600" />
                    فعال
                  </label>
                  <label className="flex items-center gap-2 text-sm font-bold">
                    <input name="isGroupAdmin" type="checkbox" defaultChecked={member.isGroupAdmin} className="size-5 accent-emerald-600" />
                    ادمین هست
                  </label>
                  <Button variant="outline">ذخیره</Button>
                  <Button form={`group-delete-person-${member.id}`} variant="danger" type="submit">حذف</Button>
                </form>
              ))}
              {members.map((member) => (
                <form key={`delete-${member.id}`} id={`group-delete-person-${member.id}`} action={deletePersonAction}>
                  <input type="hidden" name="id" value={member.id} />
                  <input type="hidden" name="groupSlug" value={group.slug} />
                </form>
              ))}
              {!members.length ? <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600">هنوز عضو ثابتی ساخته نشده.</p> : null}
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <UsersRound className="size-5 text-sky-600" />
                <h2 className="text-xl font-black">مهمان‌ها</h2>
              </div>
              <Badge tone="sky">بدون ورود</Badge>
            </div>
            <form action={upsertPersonAction} className="mb-5 grid gap-3 rounded-2xl bg-sky-50 p-4 md:grid-cols-[1fr_auto]">
              <input type="hidden" name="groupId" value={group.id} />
              <input type="hidden" name="groupSlug" value={group.slug} />
              <input type="hidden" name="type" value="GUEST" />
              <input type="hidden" name="isActive" value="on" />
              <Input name="name" placeholder="نام مهمان" required />
              <Input name="username" dir="ltr" className="text-left" placeholder="guest-username" required />
              <Button variant="secondary">افزودن مهمان</Button>
            </form>
            <div className="space-y-3">
              {guests.map((guest) => (
                <form key={guest.id} action={upsertPersonAction} className="grid gap-3 rounded-2xl border border-slate-100 p-4 md:grid-cols-[1fr_auto_auto]">
                  <input type="hidden" name="id" value={guest.id} />
                  <input type="hidden" name="groupId" value={group.id} />
                  <input type="hidden" name="groupSlug" value={group.slug} />
                  <input type="hidden" name="type" value="GUEST" />
                  <input type="hidden" name="isActive" value="on" />
                  <Input name="name" defaultValue={guest.name} />
                  <Input name="username" dir="ltr" className="text-left" defaultValue={guest.username ?? ""} />
                  <Button variant="outline">ذخیره</Button>
                  <Button form={`group-delete-person-${guest.id}`} variant="danger" type="submit">حذف</Button>
                </form>
              ))}
              {guests.map((guest) => (
                <form key={`delete-${guest.id}`} id={`group-delete-person-${guest.id}`} action={deletePersonAction}>
                  <input type="hidden" name="id" value={guest.id} />
                  <input type="hidden" name="groupSlug" value={group.slug} />
                </form>
              ))}
              {!guests.length ? <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600">هنوز مهمانی ساخته نشده.</p> : null}
            </div>
          </Card>
        </section>

        <Card>
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black">خرج‌های گروه</h2>
              <p className="mt-1 text-sm text-slate-600">اینجا خرج‌های همین گروه را مدیریت می‌کنی.</p>
            </div>
            <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white" href={`/${group.slug}/admin/expenses/new`}>
              <PlusCircle className="size-4" />
              ایجاد خرج
            </Link>
          </div>
          <div className="space-y-3">
            {group.expenses.map((expense) => {
              const unpaid = expense.participants.filter((p) => p.personId !== expense.paidByPersonId && p.paymentStatus === "UNPAID");
              return (
                <div key={expense.id} className="grid gap-3 rounded-2xl border border-slate-100 p-4 md:grid-cols-[110px_1fr_120px_160px_auto_auto] md:items-center">
                  <span className="text-sm text-slate-500">{formatDate(expense.date)}</span>
                  <div>
                    <p className="font-black">{expense.title}</p>
                    <p className="text-sm text-slate-500">پرداخت‌کننده: {expense.paidBy.name}</p>
                  </div>
                  <span className="font-black">{formatToman(expense.amount)}</span>
                  <Badge tone={unpaid.length ? "amber" : "green"}>{unpaid.length ? `${unpaid.length} نفر باز` : "تسویه"}</Badge>
                  <Link className="inline-flex h-10 items-center justify-center rounded-xl bg-amber-100 px-3 text-sm font-bold text-amber-950" href={`/${group.slug}/admin/expenses/${expense.id}/edit`}>
                    <Pencil className="size-4" />
                    ویرایش
                  </Link>
                  <form action={deleteExpenseAction}>
                    <input type="hidden" name="adminMode" value="on" />
                    <input type="hidden" name="managerScope" value="group" />
                    <input type="hidden" name="groupSlug" value={group.slug} />
                    <input type="hidden" name="id" value={expense.id} />
                    <Button variant="danger">حذف</Button>
                  </form>
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
