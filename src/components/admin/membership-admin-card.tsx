import { UserCheck } from "lucide-react";
import { reviewMembershipRequestAction } from "@/app/actions";
import { Badge } from "@/components/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type MembershipRequest = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedAt: Date;
  user: {
    name: string;
    email: string;
  };
};

type GroupMembershipAdminCardProps = {
  group: {
    slug: string;
    joinCode: string;
    membershipRequests: MembershipRequest[];
  };
};

export function MembershipAdminCard({ group }: GroupMembershipAdminCardProps) {
  const pendingRequests = group.membershipRequests.filter((request) => request.status === "PENDING");
  const inviteLink = `/login?signup=1&invite=${encodeURIComponent(group.joinCode)}`;

  return (
    <Card>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-black">کد دعوت و درخواست‌ها</h2>
          <p className="mt-1 text-sm text-slate-600">هر گروه یک کد دعوت ثابت دارد. این کد را به اعضای جدید بده.</p>
        </div>
        <Badge tone={pendingRequests.length ? "amber" : "green"}>
          {pendingRequests.length ? `${pendingRequests.length} درخواست pending` : "بدون درخواست pending"}
        </Badge>
      </div>

      <div className="mb-5 rounded-2xl bg-emerald-50 p-4">
        <p className="text-xs font-bold text-slate-500">کد دعوت گروه</p>
        <p className="mt-1 text-2xl font-black tracking-[0.25em] text-emerald-950" dir="ltr">{group.joinCode}</p>
        <p className="mt-3 text-xs font-bold text-slate-500">لینک دعوت</p>
        <a className="mt-1 block break-all text-left text-sm font-bold text-emerald-800" dir="ltr" href={inviteLink}>
          {inviteLink}
        </a>
      </div>

      <div className="space-y-3">
        {pendingRequests.map((request) => (
          <div key={request.id} className="grid gap-3 rounded-2xl border border-slate-100 p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
            <div>
              <div className="flex items-center gap-2">
                <UserCheck className="size-4 text-emerald-600" />
                <p className="font-black">{request.user.name}</p>
              </div>
              <p className="mt-1 text-sm text-slate-500" dir="ltr">{request.user.email}</p>
            </div>
            <form action={reviewMembershipRequestAction}>
              <input type="hidden" name="requestId" value={request.id} />
              <input type="hidden" name="groupSlug" value={group.slug} />
              <input type="hidden" name="decision" value="approve" />
              <Button>تایید</Button>
            </form>
            <form action={reviewMembershipRequestAction}>
              <input type="hidden" name="requestId" value={request.id} />
              <input type="hidden" name="groupSlug" value={group.slug} />
              <input type="hidden" name="decision" value="reject" />
              <Button variant="danger">رد</Button>
            </form>
          </div>
        ))}
        {!pendingRequests.length ? <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm font-bold text-slate-600">درخواست pending وجود ندارد.</p> : null}
      </div>
    </Card>
  );
}
