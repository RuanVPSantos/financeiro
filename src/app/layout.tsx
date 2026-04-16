import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finance Manager",
  description: "Gerencie suas finanças pessoais",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-full bg-[var(--bg)] text-[var(--text-primary)]">{children}</body>
    </html>
  );
}