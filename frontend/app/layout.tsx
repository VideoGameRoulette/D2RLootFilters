import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "D2R Loot Filter Builder",
  description: "Select sets and uniques to build a Diablo 2 Resurrected loot filter. Export JSON for in-game import.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased bg-[var(--bg)] text-[var(--text)]">
        {children}
      </body>
    </html>
  );
}
