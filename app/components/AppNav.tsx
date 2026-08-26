"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/src/lib/supabase/browser";
import { IconCheckCircle, IconDollar, IconHome, IconReceipt, IconUsers } from "./Icon";

const TABS = [
  { href: "/", label: "Overview", icon: <IconHome /> },
  { href: "/cards", label: "Cards", icon: "card" as const },
  { href: "/team", label: "Employees", icon: <IconUsers /> },
  { href: "/payments", label: "Payments", icon: <IconDollar /> },
  { href: "/approvals", label: "Approvals", icon: <IconCheckCircle /> },
  { href: "/reconciliation", label: "Reconciliation", icon: <IconReceipt /> },
];

export function AppNav() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const isPublicPath = pathname === "/login" || pathname === "/onboarding";
  const [showNavigation, setShowNavigation] = useState(!isPublicPath);

  useEffect(() => {
    const client = createBrowserSupabaseClient();
    let disposed = false;
    const loadStatus = async () => {
      const { data } = await client.auth.getUser();
      const nextEmail = data.user?.email ?? null;
      if (disposed) return;
      setEmail(nextEmail);
      setShowNavigation(Boolean(nextEmail));
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
      disposed = true;
      listener.subscription.unsubscribe();
      window.removeEventListener("focus", loadStatus);
      window.removeEventListener("corgi:setup-changed", loadStatus);
    };
  }, []);

  if (!showNavigation) return null;

  return (
    <header className="sidebar">
      <Link className="sidebar-brand" href="/" aria-label="Corgi home">
        <span className="brand-mark">c</span>
        <span className="sidebar-brand-word">Corgi</span>
      </Link>

      <nav className="sidebar-nav" aria-label="Primary">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={pathname === tab.href || (tab.href === "/cards" && pathname.startsWith("/cards/")) ? "page" : undefined}
            className={`sidebar-tab${pathname === tab.href || (tab.href === "/cards" && pathname.startsWith("/cards/")) ? " is-active" : ""}`}
          >
            {tab.icon === "card" ? <span className="sidebar-tab-card-chip" aria-hidden="true" /> : <span className="sidebar-tab-icon" aria-hidden="true">{tab.icon}</span>}
            <span className="sidebar-tab-label">{tab.label}</span>
          </Link>
        ))}
      </nav>

      <Link className="nav-user" href="/account" aria-label="Open account profile">
        <div className="avatar">{email?.slice(0, 2).toUpperCase() ?? "??"}</div>
        <span className="nav-user-email">{email}</span>
      </Link>
    </header>
  );
}
