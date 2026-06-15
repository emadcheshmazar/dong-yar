import type { Metadata } from "next";
import { ToastProvider } from "@/components/ui/toast";
import { getFlashToast } from "@/lib/flash-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "دنگ یار",
  description: "مدیریت ساده خرج‌های مشترک تیم‌ها",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const initialToast = await getFlashToast();

  return (
    <html lang="fa" dir="rtl">
      <body>
        <ToastProvider key={initialToast?.id ?? "no-toast"} initialToast={initialToast}>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
