import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "داریا دنگ",
  description: "مدیریت ساده خرج‌های دوستانه شرکت داریا",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
