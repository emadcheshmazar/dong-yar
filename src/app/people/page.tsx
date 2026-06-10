import { UserPlus, UsersRound } from "lucide-react";
import { upsertPersonAction } from "@/app/actions";
import { Badge } from "@/components/badge";
import { AppShell } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getPeople } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const people = await getPeople();
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-black">افراد</h1>
        <p className="mt-1 text-sm text-slate-600">عضوهای ثابت وارد می‌شوند؛ مهمان‌ها فقط برای حساب‌وکتاب خرج‌ها هستند.</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <UsersRound className="size-5 text-emerald-600" />
            <h2 className="text-xl font-black">افراد ثابت</h2>
          </div>
          <form action={upsertPersonAction} className="mb-5 grid gap-3 rounded-2xl bg-emerald-50 p-4 md:grid-cols-[1fr_1fr_auto]">
            <input type="hidden" name="type" value="MEMBER" />
            <Input name="name" placeholder="نام" required />
            <Input name="username" placeholder="نام کاربری یکتا" required />
            <label className="flex items-center gap-2 text-sm font-bold">
              <input name="isActive" type="checkbox" defaultChecked className="size-5 accent-emerald-600" />
              فعال
            </label>
            <Button className="md:col-span-3">
              <UserPlus className="size-4" />
              افزودن عضو ثابت
            </Button>
          </form>
          <div className="space-y-3">
            {people.members.map((member) => (
              <form key={member.id} action={upsertPersonAction} className="grid gap-3 rounded-2xl border border-slate-100 p-4 md:grid-cols-[1fr_1fr_auto_auto]">
                <input type="hidden" name="id" value={member.id} />
                <input type="hidden" name="type" value="MEMBER" />
                <Input name="name" defaultValue={member.name} />
                <Input name="username" defaultValue={member.username ?? ""} />
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input name="isActive" type="checkbox" defaultChecked={member.isActive} className="size-5 accent-emerald-600" />
                  فعال
                </label>
                <Button variant="outline">ذخیره</Button>
              </form>
            ))}
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
            <input type="hidden" name="type" value="GUEST" />
            <input type="hidden" name="isActive" value="on" />
            <Input name="name" placeholder="نام مهمان" required />
            <Button variant="secondary">افزودن مهمان</Button>
          </form>
          <div className="space-y-3">
            {people.guests.map((guest) => (
              <form key={guest.id} action={upsertPersonAction} className="grid gap-3 rounded-2xl border border-slate-100 p-4 md:grid-cols-[1fr_auto]">
                <input type="hidden" name="id" value={guest.id} />
                <input type="hidden" name="type" value="GUEST" />
                <input type="hidden" name="isActive" value="on" />
                <Input name="name" defaultValue={guest.name} />
                <Button variant="outline">ذخیره</Button>
              </form>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
