import type { Metadata } from "next";
import { ToastProvider } from "@/components/ui/toast";
import { getFlashToast } from "@/lib/flash-toast";
import packageJson from "../../package.json";
import "./globals.css";

export const metadata: Metadata = {
  title: "دنگ یار",
  description: "مدیریت ساده خرج‌های مشترک تیم‌ها",
};

const appVersion = packageJson.version;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const initialToast = await getFlashToast();

  return (
    <html lang="fa" dir="rtl">
      <body>
        <ToastProvider key={initialToast?.id ?? "no-toast"} initialToast={initialToast}>
          {children}
        </ToastProvider>
        <span
          aria-label={`نسخه برنامه ${appVersion}`}
          className="pointer-events-none fixed bottom-2 right-2 z-[90] select-none font-mono text-[10px] leading-none text-slate-400/80"
          dir="ltr"
          title={`نسخه برنامه ${appVersion}`}
        >
          {appVersion}
        </span>
      </body>
    </html>
  );
}
