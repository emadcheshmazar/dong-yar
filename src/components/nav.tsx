import { AppShellNav } from "@/components/app-shell-nav";
import { requirePerson } from "@/lib/auth";

export async function AppShell({ children, groupSlug }: { children: React.ReactNode; groupSlug: string }) {
  const person = await requirePerson(groupSlug);
  const prefix = `/${groupSlug}`;
  return (
    <div className="min-h-screen bg-[#f8faf2] text-slate-900">
      <AppShellNav prefix={prefix} personName={person.name} groupName={person.group.name} />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
