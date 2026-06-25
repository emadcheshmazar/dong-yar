import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList, LogOut, Pencil, PlusCircle, UserPlus, UsersRound } from "lucide-react";
import { deleteExpenseAction, deletePersonAction, logoutAllAction, upsertPersonAction } from "@/app/actions";
import { MembershipAdminCard } from "@/components/admin/membership-admin-card";
import { Badge } from "@/components/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { requireGroupAdmin } from "@/lib/auth";
import { getAdminGroup } from "@/lib/queries";
import { formatDate, formatToman } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function GroupAdminPage({ params }: { params: Promise<{ group: string }> }) {
  const { group: groupSlug } = await params;
  const currentAdmin = await requireGroupAdmin(groupSlug);
  const group = await getAdminGroup(currentAdmin.group.slug);
  if (!group) notFound();
  const members = group.people.filter((person) => person.type === "MEMBER");

  async function logout() {
    "use server";
    await logoutAllAction();
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
            <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white" href={`/${group.slug}/admin/chores`}>
              <ClipboardList className="size-4" />
              پنل کارها
            </Link>
            <Link className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-bold text-white" href="/account">
              حساب کاربری
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
        <MembershipAdminCard group={group} />

        <section id="members" className="scroll-mt-24">
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
              <PasswordInput name="password" placeholder="رمز اختیاری؛ خالی یعنی رمز مشترک" />
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
                <div key={expense.id} className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-black">{expense.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatDate(expense.date)} · پرداخت‌کننده: {expense.paidBy.name}
                      </p>
                      <p className="mt-2 font-black">{formatToman(expense.amount)}</p>
                      <div className="mt-2">
                        <Badge tone={unpaid.length ? "amber" : "green"}>
                          {unpaid.length ? `${unpaid.length} نفر باز` : "تسویه"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-100 px-3 text-sm font-bold text-amber-950 sm:flex-none" href={`/${group.slug}/admin/expenses/${expense.id}/edit`}>
                        <Pencil className="size-4" />
                        ویرایش
                      </Link>
                      <form action={deleteExpenseAction} className="flex-1 sm:flex-none">
                        <input type="hidden" name="adminMode" value="on" />
                        <input type="hidden" name="managerScope" value="group" />
                        <input type="hidden" name="groupSlug" value={group.slug} />
                        <input type="hidden" name="id" value={expense.id} />
                        <Button variant="danger" className="w-full sm:w-auto">حذف</Button>
                      </form>
                    </div>
                  </div>
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
