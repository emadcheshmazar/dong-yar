import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, PlusCircle } from "lucide-react";
import { deleteGroupAction, upsertGroupAction } from "@/app/actions";
import { Badge } from "@/components/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { destroyAdminSession, requireAdmin } from "@/lib/auth";
import { getAdminGroups } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();
  const groups = await getAdminGroups();

  async function logout() {
    "use server";
    await destroyAdminSession();
    redirect("/admin/login");
  }

  return (
    <main className="min-h-screen bg-[#f8faf2] text-slate-900">
      <header className="border-b border-slate-200 bg-white/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-black">پنل ادمین داریا دنگ</h1>
            <p className="text-sm text-slate-600">لیست گروه‌ها فقط اینجا قابل مشاهده است.</p>
          </div>
          <form action={logout}>
            <Button variant="ghost">
              <LogOut className="size-4" />
              خروج
            </Button>
          </form>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <PlusCircle className="size-5 text-emerald-600" />
            <h2 className="text-xl font-black">ساخت گروه</h2>
          </div>
          <form action={upsertGroupAction} className="space-y-3">
            <Input name="name" placeholder="نام نمایشی، مثلا Marketing" required />
            <Input name="slug" dir="ltr" className="text-left" placeholder="marketing" required />
            <label className="flex items-center gap-2 text-sm font-bold">
              <input name="isActive" type="checkbox" defaultChecked className="size-5 accent-emerald-600" />
              فعال
            </label>
            <Button className="w-full">ساخت گروه</Button>
          </form>
        </Card>
        <div className="space-y-3">
          {groups.map((group) => (
            <Card key={group.id} className="grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-black">{group.name}</h2>
                  <Badge tone={group.isActive ? "green" : "slate"}>{group.isActive ? "فعال" : "غیرفعال"}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500" dir="ltr">/{group.slug}</p>
                <p className="mt-2 text-sm text-slate-600">
                  {group._count.people} نفر، {group._count.expenses} خرج
                </p>
              </div>
              <Link className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white" href={`/admin/groups/${group.slug}`}>
                مدیریت
              </Link>
              <form action={deleteGroupAction}>
                <input type="hidden" name="id" value={group.id} />
                <Button variant="danger">حذف</Button>
              </form>
            </Card>
          ))}
          {!groups.length ? (
            <Card className="text-center text-sm font-bold text-slate-600">
              هنوز گروهی ساخته نشده. اولین گروه را از فرم کنار بساز.
            </Card>
          ) : null}
        </div>
      </div>
    </main>
  );
}
