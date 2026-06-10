import { Coins } from "lucide-react";
import { GroupLookupForm } from "@/components/group-lookup-form";
import { Card } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f8faf2] px-4 py-10 text-slate-900">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-3xl bg-emerald-600 text-white shadow-lg">
            <Coins className="size-8" />
          </div>
          <h1 className="text-3xl font-black">داریا دنگ</h1>
          <p className="mt-2 text-sm text-slate-600">برای ورود، شناسه گروه یا واحدت را وارد کن.</p>
        </div>
        <Card>
          <GroupLookupForm />
        </Card>
      </div>
    </main>
  );
}
