import { UsersRound } from "lucide-react";
import { Badge } from "@/components/badge";
import { AppShell } from "@/components/nav";
import { Card } from "@/components/ui/card";
import { requirePerson } from "@/lib/auth";
import { getPeople } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function PeoplePage({ params }: { params: Promise<{ group: string }> }) {
  const { group } = await params;
  const current = await requirePerson(group);
  const people = await getPeople(current.groupId);
  return (
    <AppShell groupSlug={current.group.slug}>
      <div className="mb-6">
        <h1 className="text-3xl font-black">افراد گروه</h1>
        <p className="mt-1 text-sm text-slate-600">مدیریت افراد فقط از پنل ادمین انجام می‌شود.</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <UsersRound className="size-5 text-emerald-600" />
            <h2 className="text-xl font-black">افراد ثابت</h2>
          </div>
          <div className="space-y-3">
            {people.members.map((member) => (
              <div key={member.id} className="flex items-center justify-between rounded-2xl border border-slate-100 p-4">
                <div>
                  <p className="font-black">{member.name}</p>
                  <p className="text-sm text-slate-500">{member.username}</p>
                </div>
                <Badge tone={member.isActive ? "green" : "slate"}>{member.isActive ? "فعال" : "غیرفعال"}</Badge>
              </div>
            ))}
            {!people.members.length ? <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600">هنوز عضوی ثبت نشده.</p> : null}
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
          <div className="space-y-3">
            {people.guests.map((guest) => (
              <div key={guest.id} className="rounded-2xl border border-slate-100 p-4">
                <p className="font-black">{guest.name}</p>
                <p className="text-sm text-slate-500">{guest.username}</p>
              </div>
            ))}
            {!people.guests.length ? <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600">هنوز مهمانی ثبت نشده.</p> : null}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
