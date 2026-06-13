import { LogOut, PlusCircle, UsersRound } from "lucide-react";
import { createAccountGroupAction, enterGroupAdminAction, enterMembershipAction, logoutAllAction, submitMembershipRequestAction } from "@/app/actions";
import { Badge } from "@/components/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const statusLabels = {
  PENDING: "در انتظار تایید",
  APPROVED: "تایید شده",
  REJECTED: "رد شده",
} as const;

export default async function AccountPage() {
  const user = await requireUser();
  const [people, requests] = await Promise.all([
    prisma.person.findMany({
      where: { userId: user.id, type: "MEMBER", isActive: true },
      include: { group: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.membershipRequest.findMany({
      where: { userId: user.id },
      include: { group: true },
      orderBy: { requestedAt: "desc" },
    }),
  ]);

  async function logout() {
    "use server";
    await logoutAllAction();
  }

  return (
    <main className="min-h-screen bg-[#f8faf2] text-slate-900">
      <header className="border-b border-slate-200 bg-white/90">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black">حساب کاربری</h1>
            <p className="text-sm text-slate-600">
              سلام {user.name}، <span dir="ltr">{user.email}</span>
            </p>
          </div>
          <form action={logout}>
            <Button variant="ghost">
              <LogOut className="size-4" />
              خروج
            </Button>
          </form>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-5 px-4 py-6 lg:grid-cols-[1fr_340px]">
        <section className="order-2 space-y-5 lg:order-1">
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <UsersRound className="size-5 text-emerald-600" />
              <h2 className="text-xl font-black">گروه‌های من</h2>
            </div>
            {!people.length ? (
              <div className="mb-4 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900">
                هنوز عضو هیچ گروهی نیستی. تا وقتی گروهی نسازی یا درخواست عضویتت تایید نشود، بخش‌های گروهی پنل قابل استفاده نیست.
              </div>
            ) : null}
            <div className="space-y-3">
              {people.map((person) => (
                <div key={person.id} className="grid gap-3 rounded-2xl border border-slate-100 p-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black">{person.group.name}</p>
                      {person.isGroupAdmin ? <Badge tone="amber">ادمین گروه</Badge> : <Badge tone="green">عضو</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-slate-500" dir="ltr">/{person.group.slug}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={enterMembershipAction}>
                      <input type="hidden" name="personId" value={person.id} />
                      <Button>ورود به گروه</Button>
                    </form>
                    {person.isGroupAdmin ? (
                      <form action={enterGroupAdminAction}>
                        <input type="hidden" name="personId" value={person.id} />
                        <Button variant="secondary">پنل مدیریت گروه</Button>
                      </form>
                    ) : null}
                  </div>
                </div>
              ))}
              {!people.length ? <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm font-bold text-slate-600">هنوز عضو هیچ گروهی نیستی.</p> : null}
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-xl font-black">درخواست‌های عضویت</h2>
            <div className="space-y-3">
              {requests.map((request) => (
                <div key={request.id} className="grid gap-3 rounded-2xl border border-slate-100 p-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <p className="font-black">{request.group.name}</p>
                    <p className="mt-1 text-sm text-slate-500" dir="ltr">/{request.group.slug}</p>
                  </div>
                  <Badge tone={request.status === "PENDING" ? "amber" : request.status === "APPROVED" ? "green" : "rose"}>
                    {statusLabels[request.status]}
                  </Badge>
                </div>
              ))}
              {!requests.length ? <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm font-bold text-slate-600">درخواستی ثبت نشده.</p> : null}
            </div>
          </Card>
        </section>

        <aside className="order-1 space-y-5 lg:order-2">
          <Card className="h-fit">
            <div className="mb-4 flex items-center gap-2">
              <PlusCircle className="size-5 text-emerald-600" />
              <h2 className="text-xl font-black">ساخت گروه</h2>
            </div>
            <p className="mb-4 text-sm text-slate-600">گروه را از همین پنل بساز. سازنده به صورت خودکار ادمین گروه می‌شود.</p>
            <form action={createAccountGroupAction} className="space-y-3">
              <Input name="name" placeholder="نام گروه، مثلا تیم مالی" required />
              <Input name="slug" dir="ltr" className="text-left" placeholder="finance" required />
              <Button className="w-full">ساخت گروه</Button>
            </form>
          </Card>

          <Card className="h-fit">
            <div className="mb-4 flex items-center gap-2">
              <PlusCircle className="size-5 text-emerald-600" />
              <h2 className="text-xl font-black">درخواست عضویت</h2>
            </div>
            <p className="mb-4 text-sm text-slate-600">کد دعوت، شناسه (slug) یا نام دقیق گروه را وارد کن.</p>
            <form action={submitMembershipRequestAction} className="space-y-3">
              <Input name="groupIdentifier" placeholder="مثلاً A1B2C3D4E5 یا finance یا تیم مالی" required />
              <Button className="w-full">ثبت درخواست</Button>
            </form>
          </Card>
        </aside>
      </div>
    </main>
  );
}
