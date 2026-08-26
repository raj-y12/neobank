import type { Metadata } from "next";
import "./globals.css";
import { AppNav } from "./components/AppNav";
import { PageTransition } from "./components/PageTransition";

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
        <div className="app-shell">
          <AppNav />
          <main className="shell"><PageTransition>{children}</PageTransition></main>
        </div>
      </body>
    </html>
  );
}
