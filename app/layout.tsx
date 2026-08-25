import type { Metadata } from "next";
import "./globals.css";
import { AppNav } from "./components/AppNav";

export const metadata: Metadata = {
  title: "Corgi | Business banking",
  description: "A Track 3 neobank prototype for US businesses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <main className="shell">
          <AppNav />
          {children}
        </main>
      </body>
    </html>
  );
}
