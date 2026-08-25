"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/src/lib/supabase/browser";
import { shouldShowAppNavigation } from "@/src/domain/navigation-gate";

const TABS = [
  { href: "/", label: "Overview", icon: "⌂" },
  { href: "/onboarding", label: "Onboarding", icon: "✓" },
  { href: "/funding", label: "Funding", icon: "$" },
  { href: "/cards", label: "Cards", icon: "card" },
];

export function AppNav() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [showNavigation, setShowNavigation] = useState(false);

  useEffect(() => {
    const client = createBrowserSupabaseClient();
    const loadStatus = async () => {
      const { data } = await client.auth.getUser();
      const nextEmail = data.user?.email ?? null;
      setEmail(nextEmail);
      if (!nextEmail) { setShowNavigation(false); return; }
      const response = await fetch("/api/navigation-status", { cache: "no-store" });
      if (!response.ok) return;
      const status = await response.json() as { authenticated: boolean; onboardingApproved: boolean; fundingLinked: boolean };
      setShowNavigation(shouldShowAppNavigation(status));
    };
    void loadStatus();
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
      if (!session) setShowNavigation(false);
      else void loadStatus();
    });
    window.addEventListener("focus", loadStatus);
    window.addEventListener("corgi:setup-changed", loadStatus);
    return () => {
      listener.subscription.unsubscribe();
      window.removeEventListener("focus", loadStatus);
      window.removeEventListener("corgi:setup-changed", loadStatus);
    };
  }, []);

  if (!showNavigation) return null;

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
      <Link className="nav-user" href="/account" aria-label="Open account profile">
        <div className="avatar">{email?.slice(0, 2).toUpperCase() ?? "??"}</div>
      </Link>
    </header>
  );
}
