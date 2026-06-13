import { redirect } from "next/navigation";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;
  const query = new URLSearchParams({ signup: "1" });
  if (invite) query.set("invite", invite);
  redirect(`/login?${query.toString()}`);
}
