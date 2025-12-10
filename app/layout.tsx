import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Referent | Минимальный Next.js",
  description: "Простая стартовая страница Next.js (app router)"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}

