import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Referent | Анализ статей",
  description: "Приложение для анализа англоязычных статей с помощью AI"
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



