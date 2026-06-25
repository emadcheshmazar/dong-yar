import Link from "next/link";
import { ArrowRight, CalendarCheck, CheckCircle2, ClipboardList, ListChecks, XCircle } from "lucide-react";
import { ChoreIntensity, ChoreStatus, ChoreType } from "@prisma/client";
import { cancelChoreAction, completeChoreAction, createChoreAction } from "@/app/actions";
import { Badge } from "@/components/badge";
import { JalaliDatePicker } from "@/components/jalali-date-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { requireGroupAdmin } from "@/lib/auth";
import { getChoreAdminPanel } from "@/lib/queries";
import { choreIntensityLabels, choreStatusLabels, choreTypeLabels, formatDate, toInputDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const choreTypes = Object.values(ChoreType);
const choreIntensities = Object.values(ChoreIntensity);

function peopleText(chore: Awaited<ReturnType<typeof getChoreAdminPanel>>["history"][number]) {
  return chore.people
    .map((entry) => `${entry.person.name} (${choreIntensityLabels[entry.intensity]})`)
    .join("، ");
}

export default async function AdminChoresPage({ params }: { params: Promise<{ group: string }> }) {
  const { group } = await params;
  const currentAdmin = await requireGroupAdmin(group);
  const data = await getChoreAdminPanel(currentAdmin.groupId);
  const today = toInputDate(new Date());
  const neverDoneRows = data.scoreRows.filter((row) => row.totalScore === 0);

  return (
    <main className="min-h-screen bg-[#f8faf2] text-slate-900">
      <header className="border-b border-slate-200 bg-white/90">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href={`/${currentAdmin.group.slug}/admin`} className="mb-2 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-700">
              <ArrowRight className="size-4" />
              برگشت به پنل ادمین
            </Link>
            <h1 className="text-2xl font-black">پنل کارهای گروه</h1>
            <p className="text-sm text-slate-600">ثبت کارها و اساین کردن نوبت‌ها، جدا از خرج و دنگ.</p>
          </div>
          <Badge tone="sky">{data.assignedChores.length ? `${data.assignedChores.length} کار باز` : "کار باز ندارید"}</Badge>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {choreTypes.map((type) => {
            const suggestion = data.suggestions[type];
            return (
              <div key={type} className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                <p className="text-sm font-bold text-slate-500">{choreTypeLabels[type]}</p>
                <p className="mt-2 text-lg font-black">{suggestion?.person.name ?? "بدون عضو"}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {suggestion ? `${suggestion.byType[type]} امتیاز در این کار، ${suggestion.totalScore} کل` : "عضوی برای پیشنهاد نیست"}
                </p>
              </div>
            );
          })}
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <ClipboardList className="size-5 text-emerald-600" />
              <h2 className="text-xl font-black">ثبت یا اساین سریع</h2>
            </div>
            <form action={createChoreAction} className="grid gap-4">
              <input type="hidden" name="groupSlug" value={currentAdmin.group.slug} />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  نوع کار
                  <Select name="type" required>
                    {choreTypes.map((type) => (
                      <option key={type} value={type}>
                        {choreTypeLabels[type]}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  وضعیت
                  <Select name="status" defaultValue={ChoreStatus.COMPLETED}>
                    <option value={ChoreStatus.COMPLETED}>ثبت انجام‌شده</option>
                    <option value={ChoreStatus.ASSIGNED}>اساین برای بعد</option>
                  </Select>
                </label>
                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  عنوان اختیاری
                  <Input name="title" placeholder="مثلا شام جمعه یا خرید صبحانه" />
                </label>
                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  تاریخ
                  <JalaliDatePicker name="scheduledFor" defaultValue={today} required />
                </label>
              </div>

              <div>
                <p className="mb-2 text-sm font-bold text-slate-700">افراد و شدت کار</p>
                <div className="grid gap-2 md:grid-cols-2">
                  {data.members.map((member) => (
                    <div key={member.id} className="grid gap-2 rounded-2xl border border-slate-100 p-3 sm:grid-cols-[1fr_130px]">
                      <label className="flex min-w-0 items-center gap-2 text-sm font-bold">
                        <input name="participantIds" value={member.id} type="checkbox" className="size-5 accent-emerald-600" />
                        <span className="truncate">{member.name}</span>
                      </label>
                      <Select name={`intensity-${member.id}`} defaultValue={ChoreIntensity.NORMAL} aria-label={`شدت کار ${member.name}`}>
                        {choreIntensities.map((intensity) => (
                          <option key={intensity} value={intensity}>
                            {choreIntensityLabels[intensity]}
                          </option>
                        ))}
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              <label className="grid gap-2 text-sm font-bold text-slate-700">
                یادداشت اختیاری
                <Textarea name="note" placeholder="اگر لازم است توضیح کوتاهی بنویس" />
              </label>
              <Button className="w-full sm:w-auto">
                <CalendarCheck className="size-4" />
                ذخیره
              </Button>
            </form>
          </Card>

          <Card>
            <div className="mb-4 flex items-center gap-2">
              <ListChecks className="size-5 text-emerald-600" />
              <h2 className="text-xl font-black">افراد بدون امتیاز</h2>
            </div>
            <div className="space-y-3">
              {neverDoneRows.map((row) => (
                <form key={row.person.id} action={createChoreAction} className="rounded-2xl border border-slate-100 p-3">
                  <input type="hidden" name="groupSlug" value={currentAdmin.group.slug} />
                  <input type="hidden" name="status" value={ChoreStatus.ASSIGNED} />
                  <input type="hidden" name="scheduledFor" value={today} />
                  <input type="hidden" name="participantIds" value={row.person.id} />
                  <input type="hidden" name={`intensity-${row.person.id}`} value={ChoreIntensity.NORMAL} />
                  <p className="font-black">{row.person.name}</p>
                  <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                    <Select name="type" aria-label={`نوع کار برای ${row.person.name}`}>
                      {choreTypes.map((type) => (
                        <option key={type} value={type}>
                          {choreTypeLabels[type]}
                        </option>
                      ))}
                    </Select>
                    <Button size="sm">اساین</Button>
                  </div>
                </form>
              ))}
              {!neverDoneRows.length ? (
                <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">همه اعضای فعال حداقل یک امتیاز کار دارند.</p>
              ) : null}
            </div>
          </Card>
        </section>

        <Card>
          <h2 className="mb-4 text-xl font-black">تراز افراد</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-right text-sm">
              <thead className="text-slate-500">
                <tr className="border-b border-slate-100">
                  <th className="py-3 font-bold">فرد</th>
                  <th className="py-3 font-bold">امتیاز کل</th>
                  {choreTypes.map((type) => (
                    <th key={type} className="py-3 font-bold">{choreTypeLabels[type]}</th>
                  ))}
                  <th className="py-3 font-bold">کار باز</th>
                  <th className="py-3 font-bold">آخرین کار</th>
                </tr>
              </thead>
              <tbody>
                {data.scoreRows.map((row, index) => (
                  <tr key={row.person.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 font-black">
                      <span className="inline-flex items-center gap-2">
                        {row.person.name}
                        {index === 0 ? <Badge tone="amber">اولویت بالا</Badge> : null}
                      </span>
                    </td>
                    <td className="py-3 font-black">{row.totalScore}</td>
                    {choreTypes.map((type) => (
                      <td key={type} className="py-3">{row.byType[type]}</td>
                    ))}
                    <td className="py-3">{row.assignedCount}</td>
                    <td className="py-3 text-slate-600">
                      {row.lastDone ? `${choreTypeLabels[row.lastDone.type]}، ${formatDate(row.lastDone.scheduledFor)}` : "ندارد"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <section className="grid gap-5 lg:grid-cols-2">
          <Card>
            <h2 className="mb-4 text-xl font-black">کارهای اساین‌شده</h2>
            <div className="space-y-3">
              {data.assignedChores.map((chore) => (
                <div key={chore.id} className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black">{chore.title}</p>
                        <Badge tone="amber">{choreStatusLabels[chore.status]}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{formatDate(chore.scheduledFor)} · {peopleText(chore)}</p>
                      {chore.note ? <p className="mt-2 text-sm text-slate-700">{chore.note}</p> : null}
                    </div>
                    <div className="flex gap-2">
                      <form action={completeChoreAction}>
                        <input type="hidden" name="groupSlug" value={currentAdmin.group.slug} />
                        <input type="hidden" name="choreId" value={chore.id} />
                        <Button size="sm">
                          <CheckCircle2 className="size-4" />
                          انجام شد
                        </Button>
                      </form>
                      <form action={cancelChoreAction}>
                        <input type="hidden" name="groupSlug" value={currentAdmin.group.slug} />
                        <input type="hidden" name="choreId" value={chore.id} />
                        <Button size="sm" variant="danger">
                          <XCircle className="size-4" />
                          لغو
                        </Button>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
              {!data.assignedChores.length ? <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600">کار باز برای پیگیری ندارید.</p> : null}
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-xl font-black">تاریخچه اخیر</h2>
            <div className="space-y-3">
              {data.history.map((chore) => (
                <div key={chore.id} className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black">{chore.title}</p>
                    <Badge tone="green">{choreTypeLabels[chore.type]}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{formatDate(chore.scheduledFor)} · {peopleText(chore)}</p>
                  {chore.note ? <p className="mt-2 text-sm text-slate-700">{chore.note}</p> : null}
                </div>
              ))}
              {!data.history.length ? <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600">هنوز کاری ثبت نشده.</p> : null}
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}
