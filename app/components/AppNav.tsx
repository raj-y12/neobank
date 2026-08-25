"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/src/lib/supabase/browser";

const TABS = [
  { href: "/", label: "Overview", icon: "⌂" },
  { href: "/onboarding", label: "Onboarding", icon: "✓" },
  { href: "/funding", label: "Funding", icon: "$" },
  { href: "/cards", label: "Cards", icon: "card" },
];

export function AppNav() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const client = createBrowserSupabaseClient();
    client.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => setEmail(session?.user.email ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (pathname === "/login" || pathname.startsWith("/auth")) return null;

  return (
    <header className="topbar">
      <div className="brand-mark" aria-label="Corgi home">c</div>

      <nav className="nav-tabs" aria-label="Primary">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`nav-tab${pathname === tab.href || (tab.href === "/cards" && pathname.startsWith("/cards/")) ? " is-active" : ""}`}
          >
            {tab.icon === "card" ? <span className="nav-tab-card-chip" aria-hidden="true" /> : <span className="nav-tab-icon" aria-hidden="true">{tab.icon}</span>}
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="topbar-spacer" />
      <div className="nav-user">
        <div className="avatar">{email?.slice(0, 2).toUpperCase() ?? "??"}</div>
        {email && <form action="/auth/signout" method="post"><button className="btn-ghost" type="submit">Sign out</button></form>}
      </div>
    </header>
  );
}
