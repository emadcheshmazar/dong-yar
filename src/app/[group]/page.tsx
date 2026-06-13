import { notFound, redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/auth";
import { getGroupBySlug } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function GroupHomePage({ params }: { params: Promise<{ group: string }> }) {
  const { group: groupSlug } = await params;
  const group = await getGroupBySlug(groupSlug);
  if (!group) notFound();
  const person = await getCurrentPerson(group.slug);
  redirect(person ? `/${group.slug}/dashboard` : "/login");
}
