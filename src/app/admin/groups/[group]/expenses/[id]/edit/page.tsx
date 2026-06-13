import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getGroupBySlug } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminEditExpensePage({
  params,
}: {
  params: Promise<{ group: string; id: string }>;
}) {
  await requireAdmin();
  const { group: groupSlug } = await params;
  const group = await getGroupBySlug(groupSlug, true);
  if (!group) notFound();
  redirect(`/admin/groups/${group.slug}`);
}
