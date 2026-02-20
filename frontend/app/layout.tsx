import type { Metadata } from "next";
import Providers from "@/contexts/ProviderContent";
import "./globals.css";

const basePath =
  (typeof process.env.NEXT_PUBLIC_BASE_PATH === "string" && process.env.NEXT_PUBLIC_BASE_PATH) ||
  "";

export const metadata: Metadata = {
  title: "D2R Loot Filter Builder",
  description: "Select sets and uniques to build a Diablo 2 Resurrected loot filter. Export JSON for in-game import.",
  icons: {
    icon: `${basePath}/favicon.ico`,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased bg-[var(--bg)] text-[var(--text)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
